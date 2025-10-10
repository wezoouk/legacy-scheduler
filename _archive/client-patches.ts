// C) Client code patches with proper error handling

// 1. Updated use-messages.ts fetch logic
const loadFromDatabase = async () => {
  if (!user || !supabase) return;

  try {
    let query = supabase
      .from('messages') // Now uses the view
      .select('*')
      .order('createdAt', { ascending: false });

    // Admin users can see all messages, regular users only their own
    if (user.plan !== 'LEGACY') {
      query = query.eq('userId', user.id);
    }

    // Filter out deleted messages by default (if your table has this field)
    // query = query.or('deleted.is.null,deleted.eq.false');

    const { data, error } = await query;

    if (error) {
      // Handle specific PostgREST errors
      if (error.code === 'PGRST205') {
        console.warn('No messages found (PGRST205)');
        setMessages([]);
        return;
      }
      
      console.error('Error fetching messages from database:', error);
      throw error;
    }

    const formattedMessages = (data || []).map((msg: any) => ({
      ...msg,
      types: Array.isArray(msg.types) ? msg.types : (msg.types ? [msg.types] : ['EMAIL']),
      createdAt: new Date(msg.createdAt),
      updatedAt: new Date(msg.updatedAt),
      scheduledFor: msg.scheduledFor ? new Date(msg.scheduledFor) : null,
    }));

    console.log(`Loaded ${formattedMessages.length} messages from database`);
    setMessages(formattedMessages);
  } catch (error) {
    console.error('Error loading from database:', error);
    throw error;
  }
};

// 2. Updated use-recipients.ts fetch logic
const loadFromDatabase = async () => {
  if (!user || !supabase) return;

  try {
    const { data, error } = await supabase
      .from('recipients') // Now uses the view
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      // Handle specific PostgREST errors
      if (error.code === 'PGRST205') {
        console.warn('No recipients found (PGRST205)');
        setRecipients([]);
        return;
      }
      
      console.error('Error fetching recipients from database:', error);
      throw error;
    }

    const formattedRecipients = (data || []).map((recipient: any) => ({
      ...recipient,
      createdAt: new Date(recipient.createdAt),
      updatedAt: new Date(recipient.updatedAt),
    }));

    console.log(`Loaded ${formattedRecipients.length} recipients from database`);
    setRecipients(formattedRecipients);
  } catch (error) {
    console.error('Error loading recipients from database:', error);
    throw error;
  }
};

// 3. Updated scheduled message service fetch
const checkAndSendScheduledMessages = async () => {
  if (!supabase) return;

  try {
    const now = new Date().toISOString();
    console.log(`Checking for scheduled messages due before ${now}`);

    const { data, error } = await supabase
      .from('messages') // Now uses the view
      .select('*')
      .eq('status', 'SCHEDULED')
      .lte('scheduledFor', now);

    if (error) {
      if (error.code === 'PGRST205') {
        console.log('No scheduled messages found (PGRST205)');
        return;
      }
      
      console.error('Error fetching scheduled messages:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log(`Found ${data.length} scheduled messages to send`);
      // Process scheduled messages...
    } else {
      console.log('No scheduled messages found');
    }
  } catch (error) {
    console.error('Error in scheduled message check:', error);
  }
};

// 4. Example fetch patterns from your logs:
// For recipients: recipients?select=*&userId=eq.admin-user-id&order=createdAt.desc
const fetchRecipientsForUser = async (userId: string) => {
  const { data, error } = await supabase
    .from('recipients')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false });
    
  return { data, error };
};

// For scheduled messages: messages?select=*&status=eq.SCHEDULED&scheduledFor=lte.<iso>
const fetchScheduledMessages = async (beforeDate: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('status', 'SCHEDULED')
    .lte('scheduledFor', beforeDate);
    
  return { data, error };
};



