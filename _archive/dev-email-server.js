// Simple development email server for testing
const express = require('express');
const cors = require('cors');
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.post('/send-email', (req, res) => {
  const { recipientEmail, recipientName, subject, content } = req.body;
  
  console.log('📧 EMAIL WOULD BE SENT:');
  console.log('To:', recipientEmail);
  console.log('Name:', recipientName);
  console.log('Subject:', subject);
  console.log('Content:', content.substring(0, 100) + '...');
  console.log('---');
  
  // Simulate successful email sending
  res.json({
    success: true,
    messageId: `dev-${Date.now()}`,
    deliveredAt: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`🔧 Development email server running on http://localhost:${port}`);
  console.log('This will log emails instead of actually sending them.');
});



