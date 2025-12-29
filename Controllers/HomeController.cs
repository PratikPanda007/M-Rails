using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using Server.Models;

namespace Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HomeController : ControllerBase
    {
        private readonly EmailSettings _emailSettings;
        private readonly IMemoryCache _cache;

        public HomeController(
    IOptions<EmailSettings> options,
    IMemoryCache cache)
        {
            _emailSettings = options.Value;
            _cache = cache;
        }

        // GET: api/home
        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new
            {
                message = "Hello from HomeController",
                time = DateTime.UtcNow
            });
        }

        // POST: api/home
        [HttpPost]
        public IActionResult Post([FromBody] HomeRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest("Name is required.");
            }

            return Ok(new
            {
                message = $"Hello, {request.Name}",
                receivedAt = DateTime.UtcNow
            });
        }

        private async Task SendEmailInternal(string subject, string body)
        {
            var mail = new MailMessage
            {
                From = new MailAddress(_emailSettings.From),
                Subject = subject,
                Body = body,
                IsBodyHtml = false
            };

            mail.To.Add(_emailSettings.From);

            using var smtp = new SmtpClient(_emailSettings.Host, _emailSettings.Port)
            {
                Credentials = new NetworkCredential(
                    _emailSettings.From,
                    _emailSettings.Password
                ),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }
        private
            async Task SendEmail(
    string toEmail,
    string subject,
    string body)
        {
            var mail = new MailMessage
            {
                From = new MailAddress(_emailSettings.From),
                Subject = subject,
                Body = body,
                IsBodyHtml = false
            };

            mail.To.Add(toEmail);

            using var smtp = new SmtpClient(_emailSettings.Host, _emailSettings.Port)
            {
                Credentials = new NetworkCredential(
                    _emailSettings.From,
                    _emailSettings.Password
                ),
                EnableSsl = true
            };

            await smtp.SendMailAsync(mail);
        }

        [HttpPost("send")]
        public async Task<IActionResult> SendContactEmail([FromBody] ContactEmailRequest request)
        {
            if (request == null)
                return BadRequest("Invalid request");

            var body = $@"
                Name: {request.FirstName}
                Email: {request.Email}
                Phone: {request.Phone}
                City: {request.City}
                State: {request.State}
                Profession: {request.Profession}
                Message: {request.Message}
                ";

            await SendEmail(
                _emailSettings.From,
                "New Contact Form Submission",
                body
            );

            return Ok("Email sent");
        }

        // SEND OTP
        [HttpPost("send-otp")]
        public async Task<IActionResult> SendOtp([FromBody] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest("Email required");

            var otp = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
            _cache.Set(email, otp, TimeSpan.FromMinutes(5));

            await SendEmail(
                email, // send to USER
                "Your OTP",
                $"Your OTP is {otp}. Valid for 5 minutes."
            );

            return Ok("OTP sent");
        }

        // ===================================================================================== [ VERIFY OTP Starts Here ]
        //[HttpPost("verify-otp")]
        //public IActionResult VerifyOtp([FromBody] VerifyOtpRequest request)
        //{
        //    if (!_cache.TryGetValue(request.Email, out string storedOtp))
        //        return BadRequest("OTP expired");

        //    if (storedOtp != request.Otp)
        //        return BadRequest("Invalid OTP");

        //    _cache.Remove(request.Email);
        //    return Ok("OTP verified");
        //}

        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            if (!_cache.TryGetValue(request.Email, out string storedOtp))
                return BadRequest("OTP expired");

            if (storedOtp != request.Otp)
                return BadRequest("Invalid OTP");

            _cache.Remove(request.Email);

            // 🔔 SEND EMAIL TO YOU (ADMIN)
            var body = $@"
                        Brochure downloaded

                        Name: {request.Name}
                        Email: {request.Email}
                        Phone: {request.Phone}
                        Time: {DateTime.UtcNow}
                        ";

            await SendEmail(
                _emailSettings.From, // 👉 YOUR email
                "Brochure Downloaded",
                body
            );

            return Ok("OTP verified");
        }
        // ===================================================================================== [ VERIFY OTP Ends Here ]
    }

    // ================= MODELS =================

    //public class HomeRequest
    //{
    //    public string Name { get; set; } = string.Empty;
    //}

    //public class EmailRequest
    //{
    //    public string Name { get; set; } = string.Empty;
    //    public string Email { get; set; } = string.Empty;
    //    public string Message { get; set; } = string.Empty;
    //}

    //public class EmailSettings
    //{
    //    public string From { get; set; } = string.Empty;
    //    public string Password { get; set; } = string.Empty;
    //    public string Host { get; set; } = string.Empty;
    //    public int Port { get; set; }
    //}

    //public class OtpSettings
    //{
    //    public int ExpiryMinutes { get; set; }
    //    public int MaxAttempts { get; set; }
    //}

    //public class VerifyOtpRequest
    //{
    //    public string Email { get; set; } = string.Empty;
    //    public string Otp { get; set; } = string.Empty;
    //}

    //public class VerifyOtpRequest
    //{
    //    public string Email { get; set; } = string.Empty;
    //    public string Otp { get; set; } = string.Empty;
    //    public string Name { get; set; } = string.Empty;
    //    public string Phone { get; set; } = string.Empty;
    //}


    //public class ContactEmailRequest
    //{
    //    public string FirstName { get; set; } = "";
    //    public string Email { get; set; } = "";
    //    public string City { get; set; } = "";
    //    public string State { get; set; } = "";
    //    public string Phone { get; set; } = "";
    //    public string Profession { get; set; } = "";
    //    public string Message { get; set; } = "";
    //}

}
