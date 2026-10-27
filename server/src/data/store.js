import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const demoUsers = [
  {
    id: "demo-citizen",
    name: "Aarav Sharma",
    email: "citizen@civic.local",
    password: "Citizen123!",
    role: "citizen",
  },
  {
    id: "demo-officer",
    name: "Mira Kapoor",
    email: "officer@civic.local",
    password: "Officer123!",
    role: "officer",
  },
];

const demoReports = [
  {
    id: "report-1001",
    title: "Deep pothole near the school crossing",
    description:
      "A deep pothole is forming beside the pedestrian crossing. It is difficult to see after sunset.",
    locationLabel: "Sector 17, Chandigarh",
    latitude: 30.7339,
    longitude: 76.7794,
    imageUrl: null,
    severity: "high",
    status: "in_progress",
    reporterId: "demo-citizen",
    createdAt: "2026-10-19T09:30:00.000Z",
    updatedAt: "2026-10-21T10:00:00.000Z",
    history: [
      {
        status: "submitted",
        note: "Report received",
        changedAt: "2026-10-19T09:30:00.000Z",
      },
      {
        status: "in_progress",
        note: "Repair team assigned",
        changedAt: "2026-10-21T10:00:00.000Z",
      },
    ],
  },
  {
    id: "report-1002",
    title: "Road surface damaged after the bus stop",
    description:
      "Several broken patches are causing vehicles to swerve into the next lane.",
    locationLabel: "Sector 22, Chandigarh",
    latitude: 30.75,
    longitude: 76.78,
    imageUrl: null,
    severity: "medium",
    status: "submitted",
    reporterId: "demo-citizen",
    createdAt: "2026-10-22T13:10:00.000Z",
    updatedAt: "2026-10-22T13:10:00.000Z",
    history: [
      {
        status: "submitted",
        note: "Report received",
        changedAt: "2026-10-22T13:10:00.000Z",
      },
    ],
  },
  {
    id: "report-1003",
    title: "Small pothole on the residential lane",
    description:
      "A small but growing pothole near the corner. Please include it in routine maintenance.",
    locationLabel: "Sector 15, Chandigarh",
    latitude: 30.72,
    longitude: 76.78,
    imageUrl: null,
    severity: "low",
    status: "resolved",
    reporterId: "demo-citizen",
    createdAt: "2026-10-14T08:45:00.000Z",
    updatedAt: "2026-10-20T15:20:00.000Z",
    history: [
      {
        status: "submitted",
        note: "Report received",
        changedAt: "2026-10-14T08:45:00.000Z",
      },
      {
        status: "in_progress",
        note: "Repair team assigned",
        changedAt: "2026-10-17T11:00:00.000Z",
      },
      {
        status: "resolved",
        note: "Repair completed",
        changedAt: "2026-10-20T15:20:00.000Z",
      },
    ],
  },
  {
    id: "report-1004",
    title: "Damaged road at the market entrance",
    description:
      "A wide broken section of road is collecting water and affecting two-wheelers.",
    locationLabel: "Sector 34, Chandigarh",
    latitude: 30.74,
    longitude: 76.8,
    imageUrl: null,
    severity: "high",
    status: "submitted",
    reporterId: "demo-citizen",
    createdAt: "2026-10-24T07:15:00.000Z",
    updatedAt: "2026-10-24T07:15:00.000Z",
    history: [
      {
        status: "submitted",
        note: "Report received",
        changedAt: "2026-10-24T07:15:00.000Z",
      },
    ],
  },
];

export async function createStore() {
  const users = new Map();
  for (const user of demoUsers) {
    users.set(user.email, {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordHash: await bcrypt.hash(user.password, 10),
    });
  }

  const reports = new Map(
    demoReports.map((report) => [report.id, structuredClone(report)]),
  );

  return {
    async findUserByEmail(email) {
      return users.get(email.toLowerCase()) ?? null;
    },
    async createUser({ name, email, passwordHash }) {
      if (users.has(email)) return null;
      const user = {
        id: randomUUID(),
        name,
        email,
        role: "citizen",
        passwordHash,
      };
      users.set(email, user);
      return user;
    },
    async listReports({ reporterId, status, search }) {
      return [...reports.values()]
        .filter((report) => !reporterId || report.reporterId === reporterId)
        .filter((report) => !status || report.status === status)
        .filter(
          (report) =>
            !search ||
            `${report.title} ${report.description} ${report.locationLabel}`
              .toLowerCase()
              .includes(search),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((report) => structuredClone(report));
    },
    async findReportById(id) {
      const report = reports.get(id);
      return report ? structuredClone(report) : null;
    },
    async createReport(input) {
      const now = new Date().toISOString();
      const report = {
        ...input,
        id: randomUUID(),
        status: "submitted",
        createdAt: now,
        updatedAt: now,
        history: [
          { status: "submitted", note: "Report received", changedAt: now },
        ],
      };
      reports.set(report.id, report);
      return structuredClone(report);
    },
    async updateReportStatus(id, status, note) {
      const report = reports.get(id);
      if (!report) return null;
      const now = new Date().toISOString();
      report.status = status;
      report.updatedAt = now;
      report.history.push({ status, note, changedAt: now });
      return structuredClone(report);
    },
  };
}
