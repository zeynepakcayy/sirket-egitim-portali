using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EgitimPortali.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameApprovalStatusToStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ApprovalStatus",
                table: "Applications",
                newName: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Status",
                table: "Applications",
                newName: "ApprovalStatus");
        }
    }
}
