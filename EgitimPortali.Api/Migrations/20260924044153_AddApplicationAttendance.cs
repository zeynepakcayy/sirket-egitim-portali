using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EgitimPortali.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddApplicationAttendance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Attendance",
                table: "Applications",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Attendance",
                table: "Applications");
        }
    }
}
