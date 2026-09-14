using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EgitimPortali.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddExternalInstructorFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Trainings_AspNetUsers_ApplicationUserId",
                table: "Trainings");

            migrationBuilder.DropIndex(
                name: "IX_Trainings_ApplicationUserId",
                table: "Trainings");

            migrationBuilder.DropColumn(
                name: "ApplicationUserId",
                table: "Trainings");

            migrationBuilder.AddColumn<string>(
                name: "ExternalInstructorEmail",
                table: "Trainings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalInstructorName",
                table: "Trainings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalInstructorOrganization",
                table: "Trainings",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExternalInstructorEmail",
                table: "Trainings");

            migrationBuilder.DropColumn(
                name: "ExternalInstructorName",
                table: "Trainings");

            migrationBuilder.DropColumn(
                name: "ExternalInstructorOrganization",
                table: "Trainings");

            migrationBuilder.AddColumn<Guid>(
                name: "ApplicationUserId",
                table: "Trainings",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Trainings_ApplicationUserId",
                table: "Trainings",
                column: "ApplicationUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Trainings_AspNetUsers_ApplicationUserId",
                table: "Trainings",
                column: "ApplicationUserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id");
        }
    }
}
