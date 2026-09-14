namespace EgitimPortali.Api.Models;

public enum TrainingStatus
{
    OpenForApplication,   // eski adı Planned'dı. Veritabanındaki karşılığı hâlâ 0.
    Ongoing,
    Completed,
    Cancelled
}

public enum ApprovalStatus
{
    Pending,
    Approved,
    Waitlisted,
    Rejected
}

public enum AttendanceStatus
{
    Pending,
    Attended,
    NotAttended
}
