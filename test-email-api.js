// Test script for the email API function
const testEmailAPI = async () => {
  try {
    console.log('Testing email API...');
    
    const response = await fetch('http://localhost:3001/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientEmail: 'davwez@gmail.com',
        recipientName: 'Test User',
        subject: 'Test Email from Legacy Scheduler',
        content: 'This is a test email to verify the API is working correctly.',
        attachments: []
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success:', result);
    } else {
      const error = await response.json();
      console.log('❌ Error:', error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

// Run the test
testEmailAPI();



