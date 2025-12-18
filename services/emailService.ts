/**
 * Handles Email operations using SendGrid Web API.
 */

export const sendEmailOTP = async (email: string, otp: string): Promise<boolean> => {
  const API_KEY = import.meta.env.SENDGRID_API_KEY;
  
  if (!API_KEY) {
    console.warn("SendGrid API Key is missing. Email skipped.");
    return false;
  }

  const data = {
    personalizations: [{ to: [{ email }] }],
    from: { email: "auth@himashospital.com", name: "Himas Hospital Security" },
    subject: "Himas Hospital Access Code",
    content: [{
      type: "text/plain",
      value: `Your One-Time Password (OTP) for Himas Hospital Management System is: ${otp}`
    }]
  };

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    return response.ok;
  } catch (error) {
    console.error("Email Transport Error:", error);
    return false;
  }
};
