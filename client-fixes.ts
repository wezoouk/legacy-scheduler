// Client code fixes with UUID validation and proper auth integration

// 1. UUID validation utility
export const isUuid = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

// 2. Updated use-recipients.ts
import { supabase } from './supabase';
import { isUuid } from './utils';

export const useRecipients = () => {
  const [recipients, setRecipients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth(); // Get real auth user

  const fetchRecipients = async () => {
    if (!user) return;

    try {
      // Check if user ID is a valid UUID
      if (!isUuid(user.id)) {
        console.warn('Invalid user ID format, using localStorage fallback');
        loadFromLocalStorage();
        return;
      }

      if (isSupabaseConfigured && supabase) {
        console.log('Fetching recipients from Supabase database');
        await loadFromDatabase();
      } else {
        console.log('Supabase not configured, using localStorage fallback');
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error fetching recipients:', error);
      console.log('Falling back to localStorage');
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromDatabase = async () => {
    if (!user || !supabase || !isUuid(user.id)) return;

    try {
      const { data, error } = await supabase
        .from('recipients') // Use snake_case view
        .select('*')
        .eq('user_id', user.id) // Use snake_case column
        .order('created_at', { ascending: false }); // Use snake_case column

      if (error) {
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
        userId: recipient.user_id, // Map back to camelCase for client
        createdAt: new Date(recipient.created_at),
        updatedAt: new Date(recipient.updated_at),
      }));

      console.log(`Loaded ${formattedRecipients.length} recipients from database`);
      setRecipients(formattedRecipients);
    } catch (error) {
      console.error('Error loading recipients from database:', error);
      throw error;
    }
  };

  // ... rest of component logic
};

// 3. Updated use-messages.ts
export const useMessages = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth(); // Get real auth user

  const fetchMessages = async () => {
    if (!user) return;

    try {
      // Check if user ID is a valid UUID
      if (!isUuid(user.id)) {
        console.warn('Invalid user ID format, using localStorage fallback');
        loadFromLocalStorage();
        return;
      }

      if (isSupabaseConfigured && supabase) {
        console.log('Fetching messages from Supabase database');
        await loadFromDatabase();
      } else {
        console.log('Supabase not configured, using localStorage fallback');
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      console.log('Falling back to localStorage');
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromDatabase = async () => {
    if (!user || !supabase || !isUuid(user.id)) return;

    try {
      let query = supabase
        .from('messages') // Use snake_case view
        .select('*')
        .order('created_at', { ascending: false }); // Use snake_case column

      // Admin users can see all messages, regular users only their own
      if (user.plan !== 'LEGACY') {
        query = query.eq('user_id', user.id); // Use snake_case column
      }

      // Filter out deleted messages - now safe with the deleted column
      query = query.or('deleted.is.null,deleted.eq.false');

      const { data, error } = await query;

      if (error) {
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
        userId: msg.user_id, // Map back to camelCase for client
        scheduledFor: msg.scheduled_for ? new Date(msg.scheduled_for) : null,
        recipientIds: msg.recipient_ids,
        cipherBlobUrl: msg.cipher_blob_url,
        thumbnailUrl: msg.thumbnail_url,
        createdAt: new Date(msg.created_at),
        updatedAt: new Date(msg.updated_at),
        types: Array.isArray(msg.types) ? msg.types : (msg.types ? [msg.types] : ['EMAIL']),
      }));

      console.log(`Loaded ${formattedMessages.length} messages from database`);
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages from database:', error);
      throw error;
    }
  };

  // ... rest of component logic
};

// 4. Updated scheduled message service
export const checkAndSendScheduledMessages = async () => {
  if (!supabase) return;

  try {
    const now = new Date().toISOString();
    console.log(`Checking for scheduled messages due before ${now}`);

    const { data, error } = await supabase
      .from('messages') // Use snake_case view
      .select('*')
      .eq('status', 'SCHEDULED')
      .lte('scheduled_for', now); // Use snake_case column

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



