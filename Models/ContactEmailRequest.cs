namespace Server.Models
{
    public class ContactEmailRequest
    {
        public string FirstName { get; set; } = "";
        public string Email { get; set; } = "";
        public string City { get; set; } = "";
        public string State { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Profession { get; set; } = "";
        public string Message { get; set; } = "";
    }
}
