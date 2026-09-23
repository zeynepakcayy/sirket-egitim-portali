using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EgitimPortali.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationEmailSentAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EmailSentAt",
                table: "Notifications",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EmailSentAt",
                table: "Notifications");
        }
    }
}
