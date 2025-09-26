import { supabase, isSupabaseConfigured } from './supabase';
import { MediaService } from './media-service';

export interface MigrationResult {
  success: boolean;
  messagesMigrated: number;
  recipientsMigrated: number;
  errors: string[];
}

export class MigrationService {
  /**
   * Migrate all localStorage data to Supabase database
   */
  static async migrateAllData(): Promise<MigrationResult> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }

    // Check if user is authenticated, but allow legacy mode
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('No Supabase session found, proceeding with legacy mode migration');
    }

    const result: MigrationResult = {
      success: true,
      messagesMigrated: 0,
      recipientsMigrated: 0,
      errors: [] as string[]
    };

    try {
      console.log('Starting data migration from localStorage to Supabase...');

      // First, migrate users to create proper Supabase user accounts
      const usersResult = await this.migrateUsers();
      result.errors.push(...usersResult.errors);

      // Migrate recipients
      const recipientsResult = await this.migrateRecipients();
      result.recipientsMigrated = recipientsResult.migrated;
      result.errors.push(...recipientsResult.errors);

      // Migrate messages
      const messagesResult = await this.migrateMessages();
      result.messagesMigrated = messagesResult.migrated;
      result.errors.push(...messagesResult.errors);

      if (result.errors.length > 0) {
        result.success = false;
        console.warn('Migration completed with errors:', result.errors);
      } else {
        console.log('Migration completed successfully!');
      }

      return result;
    } catch (error) {
      console.error('Migration failed:', error);
      result.success = false;
      result.errors.push(`Migration failed: ${error}`);
      return result;
    }
  }

  /**
   * Migrate users from localStorage to database
   */
  private static async migrateUsers(): Promise<{ migrated: number; errors: string[] }> {
    const result = { migrated: 0, errors: [] as string[] };

    try {
      // Get current authenticated user (if any)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        console.log('No authenticated user, creating a temporary user for migration');
        // Create a temporary user for migration
        const tempUserId = crypto.randomUUID();
        localStorage.setItem('temp_migration_user_id', tempUserId);
        
        // Create user profile in database
        const { error } = await supabase
          .from('users')
          .insert({
            id: tempUserId,
            email: 'migration@temp.com',
            name: 'Migration User',
            plan: 'LEGACY',
            timezone: 'Europe/London',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

        if (error) {
          result.errors.push(`Failed to create temporary user: ${error.message}`);
          return result;
        }
        
        // Map all localStorage users to this temporary user
        const usersData = localStorage.getItem('legacyScheduler_users');
        if (usersData) {
          const users = JSON.parse(usersData);
          for (const user of users) {
            localStorage.setItem(`user_mapping_${user.id}`, tempUserId);
          }
        }
        
        result.migrated = 1;
        console.log('Created temporary user for migration');
        return result;
      }

      // Get all users from localStorage
      const usersData = localStorage.getItem('legacyScheduler_users');
      if (!usersData) {
        console.log('No users found in localStorage');
        return result;
      }

      const users = JSON.parse(usersData);
      console.log(`Found ${users.length} users to migrate`);

      // Find the current user in localStorage
      const currentUser = users.find((u: any) => u.email === authUser.email);
      if (!currentUser) {
        result.errors.push(`Current user ${authUser.email} not found in localStorage`);
        return result;
      }

      // Check if user already exists in database
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .single();

      if (!existing) {
        // Create user profile in database
        const { error } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email!,
            name: currentUser.name || authUser.email?.split('@')[0] || 'User',
            plan: currentUser.plan || 'FREE',
            timezone: currentUser.timezone || 'Europe/London',
            createdAt: currentUser.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

        if (error) {
          result.errors.push(`Failed to create user profile: ${error.message}`);
        } else {
          result.migrated++;
          console.log(`Created user profile for ${authUser.email}`);
        }
      } else {
        console.log(`User ${authUser.email} already exists in database`);
      }

      // Store the mapping from old ID to current user ID
      localStorage.setItem(`user_mapping_${currentUser.id}`, authUser.id);
      console.log(`Mapped ${currentUser.id} to ${authUser.id}`);

    } catch (error) {
      result.errors.push(`Error migrating users: ${error}`);
    }

    return result;
  }

  /**
   * Migrate recipients from localStorage to database
   */
  private static async migrateRecipients(): Promise<{ migrated: number; errors: string[] }> {
    const result = { migrated: 0, errors: [] as string[] };

    try {
      // Get all users from localStorage
      const usersData = localStorage.getItem('legacyScheduler_users');
      if (!usersData) {
        console.log('No users found in localStorage');
        return result;
      }

      const users = JSON.parse(usersData);
      console.log(`Found ${users.length} users to migrate recipients for`);

      for (const user of users) {
        // Get the mapped UUID for this user
        const mappedUserId = localStorage.getItem(`user_mapping_${user.id}`);
        if (!mappedUserId) {
          result.errors.push(`No mapped user ID found for ${user.email}`);
          continue;
        }

        const recipientsKey = `recipients_${user.id}`;
        const storedRecipients = localStorage.getItem(recipientsKey);
        
        if (storedRecipients) {
          const recipients = JSON.parse(storedRecipients);
          console.log(`Migrating ${recipients.length} recipients for user ${user.email}`);

          for (const recipient of recipients) {
            try {
              // Check if recipient already exists in database by email and userId
              const { data: existing } = await supabase
                .from('recipients')
                .select('id')
                .eq('email', recipient.email)
                .eq('userId', mappedUserId)
                .single();

              if (!existing) {
                // Generate new UUID for migrated recipient
                const newId = crypto.randomUUID();
                
                // Insert recipient into database
                const { error } = await supabase
                  .from('recipients')
                  .insert({
                    id: newId,
                    userId: mappedUserId,
                    name: recipient.name,
                    email: recipient.email,
                    phone: recipient.phone || null,
                    timezone: recipient.timezone || 'Europe/London',
                    verified: recipient.verified || false,
                    createdAt: recipient.createdAt,
                    updatedAt: recipient.updatedAt,
                  });

                if (error) {
                  result.errors.push(`Failed to migrate recipient ${recipient.email}: ${error.message}`);
                } else {
                  result.migrated++;
                }
              } else {
                console.log(`Recipient ${recipient.email} already exists in database`);
              }
            } catch (error) {
              result.errors.push(`Error migrating recipient ${recipient.email}: ${error}`);
            }
          }
        }
      }
    } catch (error) {
      result.errors.push(`Error migrating recipients: ${error}`);
    }

    return result;
  }

  /**
   * Migrate messages from localStorage to database
   */
  private static async migrateMessages(): Promise<{ migrated: number; errors: string[] }> {
    const result = { migrated: 0, errors: [] as string[] };

    try {
      // Get all users from localStorage
      const usersData = localStorage.getItem('legacyScheduler_users');
      if (!usersData) {
        console.log('No users found in localStorage');
        return result;
      }

      const users = JSON.parse(usersData);
      console.log(`Found ${users.length} users to migrate messages for`);

      for (const user of users) {
        // Get the mapped UUID for this user
        const mappedUserId = localStorage.getItem(`user_mapping_${user.id}`);
        if (!mappedUserId) {
          result.errors.push(`No mapped user ID found for ${user.email}`);
          continue;
        }

        const messagesKey = `messages_${user.id}`;
        const storedMessages = localStorage.getItem(messagesKey);
        
        if (storedMessages) {
          const messages = JSON.parse(storedMessages);
          console.log(`Migrating ${messages.length} messages for user ${user.email}`);

          for (const message of messages) {
            try {
              // Check if message already exists in database by title, userId, and createdAt
              const { data: existing } = await supabase
                .from('messages')
                .select('id')
                .eq('title', message.title)
                .eq('userId', mappedUserId)
                .eq('createdAt', message.createdAt)
                .single();

              if (!existing) {
                // Generate new UUID for migrated message
                const newId = crypto.randomUUID();
                
                // Handle media files if they exist
                let cipherBlobUrl = null;
                let thumbnailUrl = null;

                if (message.videoRecording) {
                  try {
                    // Convert data URL to blob and upload
                    const blob = MediaService.dataURLToBlob(message.videoRecording);
                    const uploadResult = await MediaService.uploadVideo(blob, 'migrated_video.webm');
                    cipherBlobUrl = uploadResult.url;
                    thumbnailUrl = uploadResult.url;
                    console.log(`Uploaded video for message ${message.id}`);
                  } catch (error) {
                    console.warn(`Failed to upload video for message ${message.id}:`, error);
                    result.errors.push(`Failed to upload video for message ${message.id}: ${error}`);
                  }
                } else if (message.audioRecording) {
                  try {
                    // Convert data URL to blob and upload
                    const blob = MediaService.dataURLToBlob(message.audioRecording);
                    const uploadResult = await MediaService.uploadAudio(blob, 'migrated_audio.webm');
                    cipherBlobUrl = uploadResult.url;
                    console.log(`Uploaded audio for message ${message.id}`);
                  } catch (error) {
                    console.warn(`Failed to upload audio for message ${message.id}:`, error);
                    result.errors.push(`Failed to upload audio for message ${message.id}: ${error}`);
                  }
                }

                // Insert message into database
                const { error } = await supabase
                  .from('messages')
                  .insert({
                    id: newId,
                    userId: mappedUserId,
                    scope: message.scope || 'NORMAL',
                    types: Array.isArray(message.types) ? message.types : (message.types ? [message.types] : ['EMAIL']),
                    title: message.title,
                    content: message.content,
                    status: message.status || 'DRAFT',
                    scheduledFor: message.scheduledFor || null,
                    recipientIds: Array.isArray(message.recipientIds) ? message.recipientIds : [],
                    cipherBlobUrl,
                    thumbnailUrl,
                    createdAt: message.createdAt,
                    updatedAt: message.updatedAt,
                  });

                if (error) {
                  result.errors.push(`Failed to migrate message ${message.title}: ${error.message}`);
                } else {
                  result.migrated++;
                }
              } else {
                console.log(`Message ${message.title} already exists in database`);
              }
            } catch (error) {
              result.errors.push(`Error migrating message ${message.title}: ${error}`);
            }
          }
        }
      }
    } catch (error) {
      result.errors.push(`Error migrating messages: ${error}`);
    }

    return result;
  }

  /**
   * Check if migration is needed (has localStorage data but no database data)
   */
  static async isMigrationNeeded(): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) {
      return false;
    }

    try {
      // Check if there's any data in localStorage
      const usersData = localStorage.getItem('legacyScheduler_users');
      if (!usersData) {
        return false;
      }

      const users = JSON.parse(usersData);
      let hasLocalData = false;

      for (const user of users) {
        const messagesKey = `messages_${user.id}`;
        const recipientsKey = `recipients_${user.id}`;
        
        if (localStorage.getItem(messagesKey) || localStorage.getItem(recipientsKey)) {
          hasLocalData = true;
          break;
        }
      }

      if (!hasLocalData) {
        return false;
      }

      // Check if database already has data
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
        .limit(1);

      const { data: recipients } = await supabase
        .from('recipients')
        .select('id')
        .limit(1);

      // If localStorage has data but database is empty, migration is needed
      return (messages?.length === 0 && recipients?.length === 0);
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Clear localStorage data after successful migration
   */
  static clearLocalStorageData(): void {
    try {
      console.log('Clearing localStorage data after migration...');
      
      // Get all users
      const usersData = localStorage.getItem('legacyScheduler_users');
      if (usersData) {
        const users = JSON.parse(usersData);
        
        for (const user of users) {
          localStorage.removeItem(`messages_${user.id}`);
          localStorage.removeItem(`recipients_${user.id}`);
        }
      }
      
      console.log('LocalStorage data cleared successfully');
    } catch (error) {
      console.error('Error clearing localStorage data:', error);
    }
  }
}
