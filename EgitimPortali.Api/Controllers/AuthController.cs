using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using EgitimPortali.Api.Models;
using EgitimPortali.Api.DTOs;
using EgitimPortali.Api.Services;

namespace EgitimPortali.Api.Controllers

{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly TokenService _tokenService;

        public AuthController(UserManager<ApplicationUser> userManager, TokenService tokenService)
        {
            _userManager = userManager;
            _tokenService = tokenService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequestDto request)
        {
            var user = new ApplicationUser
            {
                UserName = request.Email,
                Email = request.Email,
                FullName = request.FullName,
                Department = request.Department,
                CreatedAt = DateTime.UtcNow
            };

            var result = await _userManager.CreateAsync(user, request.Password);

            if (!result.Succeeded)
            {
                return BadRequest(result.Errors);
            }

            await _userManager.AddToRoleAsync(user, "Employee");

            return Ok(new { message = "Kayıt başarılı" });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequestDto request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);

            if (user == null)
            {
                return Unauthorized(new { message = "Email veya şifre hatalı" });
            }

            var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);

            if (!passwordValid)
            {
                return Unauthorized(new { message = "Email veya şifre hatalı" });
            }

            var roles = await _userManager.GetRolesAsync(user);
            var role = roles.FirstOrDefault() ?? "Calisan";

            var token = _tokenService.GenerateToken(user, role);

            var response = new AuthResponseDto
            {
                Token = token,
                Email = user.Email ?? string.Empty,
                FullName = user.FullName,
                Role = role,
                Department = user.Department
            };

            return Ok(response);
        }
    }
}
