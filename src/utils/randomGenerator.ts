export const generateTicketNumbers = (quantity: number): string[] => {
  const ticketNumbers: string[] = [];
  
  for (let i = 0; i < quantity; i++) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ticketNumber = `RC${timestamp}${random}`;
    ticketNumbers.push(ticketNumber);
  }
  
  return ticketNumbers;
};

export const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RC${timestamp}${random}`;
};




