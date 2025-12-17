
/**
 * Handles SMS operations.
 * Currently simulates sending an SMS for demonstration purposes.
 * In production, integrate with Twilio, AWS SNS, or a local SMS gateway.
 */

export const sendSMSOTP = async (mobile: string, otp: string): Promise<boolean> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Log to console for debugging/demo
  console.log(`%c[SMS SERVICE] Sending OTP ${otp} to ${mobile}`, 'color: #10b981; font-weight: bold; font-size: 14px;');
  
  // In a real app, we would return true only if the API call was successful.
  // For this demo, we assume success.
  return true;
};
