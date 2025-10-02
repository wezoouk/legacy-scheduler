import { supabase, isSupabaseConfigured } from './supabase';

export type DmsConfigDb = any; // dynamic keys; support snake_case or camelCase

export type DmsCycleDb = any; // dynamic keys; support snake_case or camelCase

export class DmsService {
  static async getConfigForUser(userId: string): Promise<DmsConfigDb | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('dms_configs')
      .select('*')
      .eq('userId', userId) // Database uses camelCase userId
      .order('updatedAt', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('getConfigForUser error:', error);
      return null;
    }
    return data as unknown as DmsConfigDb | null;
  }

  static async upsertConfig(config: DmsConfigDb): Promise<DmsConfigDb | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    
    const userId = config.userId || config.user_id;
    
    // Try camelCase first
    const camel: any = {
      userId: userId,
      frequencyDays: config.frequencyDays || config.frequency_days,
      graceDays: config.graceDays || config.grace_days,
      durationDays: config.durationDays || config.duration_days,
      checkInReminderHours: config.checkInReminderHours || config.check_in_reminder_hours,
      frequencyUnit: config.frequencyUnit || config.frequency_unit || 'days',
      graceUnit: config.graceUnit || config.grace_unit || 'days',
      channels: config.channels,
      escalationContactId: config.escalationContactId ?? config.escalation_contact_id ?? null,
      emergencyInstructions: config.emergencyInstructions ?? config.emergency_instructions ?? null,
      status: config.status,
      cooldownUntil: config.cooldownUntil || config.cooldown_until || null,
      lastCheckin: config.lastCheckin || config.last_checkin || null,
      nextCheckin: config.nextCheckin || config.next_checkin || null,
      startDate: config.startDate || config.start_date || null,
      endDate: config.endDate || config.end_date || null,
    };
    
    // Check if config exists for this user
    const { data: existing } = await supabase
      .from('dms_configs')
      .select('id')
      .eq('userId', userId)
      .maybeSingle();
    
    let res;
    if (existing) {
      // UPDATE existing config
      res = await supabase
        .from('dms_configs')
        .update(camel)
        .eq('id', existing.id)
        .select('*')
        .maybeSingle();
    } else {
      // INSERT new config
      res = await supabase.from('dms_configs').insert(camel).select('*').maybeSingle();
    }
    if (res.error) {
      console.error('upsertConfig error (camelCase):', {
        message: res.error.message,
        details: res.error.details,
        hint: res.error.hint,
        code: res.error.code,
        fullError: res.error
      });
      // Fallback to snake_case
      const snake: any = {
        user_id: camel.userId,
        frequency_days: camel.frequencyDays,
        grace_days: camel.graceDays,
        duration_days: camel.durationDays,
        check_in_reminder_hours: camel.checkInReminderHours,
        frequency_unit: camel.frequencyUnit,
        grace_unit: camel.graceUnit,
        channels: camel.channels,
        escalation_contact_id: camel.escalationContactId,
        emergency_instructions: camel.emergencyInstructions,
        status: camel.status,
        cooldown_until: camel.cooldownUntil,
        last_checkin: camel.lastCheckin,
        next_checkin: camel.nextCheckin,
        start_date: camel.startDate,
        end_date: camel.endDate,
      };
      
      if (existing) {
        // UPDATE existing config
        res = await supabase
          .from('dms_configs')
          .update(snake)
          .eq('id', existing.id)
          .select('*')
          .maybeSingle();
      } else {
        // INSERT new config
        res = await supabase.from('dms_configs').insert(snake).select('*').maybeSingle();
      }
      if (res.error) {
        console.error('upsertConfig error (snake_case):', {
          message: res.error.message,
          details: res.error.details,
          hint: res.error.hint,
          code: res.error.code,
          fullError: res.error
        });
        return null;
      }
    }
    return res.data as DmsConfigDb;
  }

  static async getLatestCycle(configId: string, userId: string): Promise<DmsCycleDb | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    const { data, error } = await supabase
      .from('dms_cycles')
      .select('*')
      .eq('configId', configId) // Database uses camelCase configId
      .order('updatedAt', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('getLatestCycle error:', error);
      return null;
    }
    return data as unknown as DmsCycleDb | null;
  }

  static async upsertCycle(cycle: DmsCycleDb): Promise<DmsCycleDb | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    // Try camelCase first
    const camel: any = {
      id: cycle.id,
      configId: cycle.configId || cycle.config_id,
      userId: cycle.userId || cycle.user_id,
      nextCheckinAt: cycle.nextCheckinAt || cycle.next_checkin_at,
      state: cycle.state,
      reminders: cycle.reminders,
      checkInReminderSent: cycle.checkInReminderSent ?? cycle.check_in_reminder_sent,
      lastReminderSent: cycle.lastReminderSent || cycle.last_reminder_sent,
    };
    let res = await supabase.from('dms_cycles').upsert(camel, { onConflict: 'id' }).select('*').maybeSingle();
    if (res.error) {
      const snake: any = {
        id: camel.id,
        config_id: camel.configId,
        user_id: camel.userId,
        next_checkin_at: camel.nextCheckinAt,
        state: camel.state,
        reminders: camel.reminders,
        check_in_reminder_sent: camel.checkInReminderSent,
        last_reminder_sent: camel.lastReminderSent,
      };
      res = await supabase.from('dms_cycles').upsert(snake, { onConflict: 'id' }).select('*').maybeSingle();
      if (res.error) {
        console.error('upsertCycle error:', res.error);
        return null;
      }
    }
    return res.data as DmsCycleDb;
  }

  static async checkIn(config: DmsConfigDb, cycle: DmsCycleDb): Promise<{ config: DmsConfigDb | null; cycle: DmsCycleDb | null }> {
    if (!isSupabaseConfigured || !supabase) return { config: null, cycle: null };
    const now = new Date();
    const freqVal = config.frequencyDays || config.frequency_days || 7;
    const fUnit = (config.frequencyUnit || config.frequency_unit || 'days') as 'minutes'|'hours'|'days';
    const mult = fUnit === 'minutes' ? 60*1000 : fUnit === 'hours' ? 60*60*1000 : 24*60*60*1000;
    const next = new Date(now.getTime() + freqVal * mult);
    const updatedConfig: DmsConfigDb = {
      ...config,
      lastCheckin: now.toISOString(),
      nextCheckin: next.toISOString(),
    };
    const savedConfig = await this.upsertConfig(updatedConfig);
    const updatedCycle: DmsCycleDb = {
      ...cycle,
      nextCheckinAt: next.toISOString(),
      state: 'ACTIVE',
      checkInReminderSent: false,
      lastReminderSent: null,
    } as DmsCycleDb;
    const savedCycle = await this.upsertCycle(updatedCycle);
    return { config: savedConfig, cycle: savedCycle };
  }
}


