namespace Server.Models
{
    public class OtpSettings
    {
        public int ExpiryMinutes { get; set; }
        public int MaxAttempts { get; set; }
    }
}
