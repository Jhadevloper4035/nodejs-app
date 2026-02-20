// Test Email Configuration
require('dotenv').config();
const nodemailer = require('nodemailer');

const config = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
  from: process.env.MAIL_FROM || process.env.SMTP_FROM,
};



if (!config.host || !config.user || !config.pass) {
  console.error('❌ Missing SMTP configuration!');

  process.exit(1);
}

async function testEmail() {
  try {
    console.log('🔄 Creating transporter...');
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      requireTLS: true,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    console.log('🔄 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified!\n');

    console.log('🔄 Sending test email...');
    const info = await transporter.sendMail({
      from: config.from,
      to: config.user, // Send to yourself for testing
      subject: '✅ Test Email - SMTP Working!',
      text: 'This is a test email. Your SMTP configuration is working correctly!',
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;background:#f5f5f5">
          <div style="background:white;padding:30px;border-radius:8px;max-width:600px;margin:0 auto">
            <h2 style="color:#22c55e">✅ SMTP Configuration Test</h2>
            <p>Hello!</p>
            <p>This is a test email to verify your SMTP configuration.</p>
            <p><strong>Your email settings are working correctly!</strong></p>
            <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
            <p style="color:#666;font-size:14px">
              Sent from: ${config.from}<br>
              SMTP Host: ${config.host}<br>
              SMTP Port: ${config.port}
            </p>
          </div>
        </div>
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Sent to: ${config.user}`);
    console.log('\n🎉 Email configuration is working! Check your inbox.\n');
    
  } catch (error) {
    console.error('\n❌ Email test failed!');
    console.error(`   Error: ${error.message}\n`);
    
    if (error.code === 'EAUTH') {
      console.log('💡 Authentication failed. Check:');
      console.log('   1. Email address is correct');
      console.log('   2. Using App Password (not regular password)');
      console.log('   3. For Gmail: Enable 2FA and create App Password');
      console.log('      Go to: https://myaccount.google.com/apppasswords\n');
    } else if (error.code === 'ECONNECTION') {
      console.log('💡 Connection failed. Check:');
      console.log('   1. SMTP host and port are correct');
      console.log('   2. Firewall allows outbound connections');
      console.log('   3. Network connection is working\n');
    }
    
    process.exit(1);
  }
}

testEmail();
