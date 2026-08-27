/**
 * Demo data + field schemas for the property-management modules.
 * These modules are frontend-only mocks: swapping them to the real backend is
 * a matter of replacing the store calls in src/lib/store.ts.
 */

export type FieldType =
  | "text" | "number" | "money" | "date" | "select" | "textarea" | "entity-select" | "boolean";

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  inTable?: boolean;
  badge?: boolean;
  placeholder?: string;
  sourceResource?: string;
  labelKey?: string;
  required?: boolean;
  ownerEditable?: boolean;
  hideForUnitTypes?: string[];
}

export interface ResourceDef {
  key: string;
  title: string;
  description: string;
  singular: string;
  fields: FieldDef[];
  seed: Record<string, unknown>[];
  apiBacked?: boolean;
}

export type Row = Record<string, unknown> & { id: string };

const BUILDINGS = ["Emerald Heights", "Slate Tower", "Riverside Court", "Uttara Business Park"];

const CURRENCY_OPTIONS = [
  "USD", "EUR", "GBP", "BDT", "INR", "AED", "SAR", "AUD", "CAD", "JPY",
  "CNY", "SGD", "MYR", "THB", "CHF", "SEK", "NOK", "DKK", "NZD", "ZAR",
  "PKR", "NPR", "LKR", "QAR", "KWD", "OMR", "BHD", "EGP", "TRY", "RUB",
];

function def(
  key: string,
  title: string,
  singular: string,
  description: string,
  fields: FieldDef[],
  seed: Record<string, unknown>[],
): ResourceDef {
  return { key, title, singular, description, fields, seed };
}

export const resources: Record<string, ResourceDef> = {
  properties: {
    key: "properties",
    title: "Properties",
    singular: "Property",
    description: "Properties on the platform — live backend, superAdmin-managed.",
    apiBacked: true,
    fields: [
      { key: "title", label: "Title / Building name", inTable: true, required: true },
      { key: "buildingNumber", label: "Building number" },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: ["apartment", "house", "villa", "office", "shop", "land"],
        inTable: true,
        required: true,
      },
      {
        key: "listingType",
        label: "Listing type",
        type: "select",
        options: ["rent"],
        inTable: true,
        required: true,
      },
      { key: "price", label: "Subscription price", type: "money", inTable: true, required: true },
      { key: "currency", label: "Currency", type: "select", options: CURRENCY_OPTIONS },
      { key: "floors", label: "Floors", type: "number" },
      { key: "totalUnits", label: "Total units", type: "number" },
      { key: "totalArea", label: "Total area", type: "number" },
      { key: "address", label: "Address", inTable: true, required: true },
      { key: "city", label: "City", inTable: true, required: true },
      { key: "state", label: "State", ownerEditable: true },
      { key: "country", label: "Country", inTable: true, required: true },
      { key: "postalCode", label: "Postal code", ownerEditable: true },
      { key: "latitude", label: "Latitude", type: "number" },
      { key: "longitude", label: "Longitude", type: "number" },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["draft", "active", "inactive", "rented"],
        inTable: true,
        badge: true,
      },
      {
        key: "ownerId",
        label: "Owner",
        type: "entity-select",
        sourceResource: "ownerAccounts",
        labelKey: "displayLabel",
        inTable: true,
        required: true,
      },
      { key: "description", label: "Description / note", type: "textarea", ownerEditable: true },
    ],
    seed: [],
  },

  floors: {
    key: "floors",
    title: "Floors",
    singular: "Floor",
    description: "Floors under a property — live backend, superAdmin-managed.",
    apiBacked: true,
    fields: [
      {
        key: "propertyId",
        label: "Property",
        type: "entity-select",
        sourceResource: "properties",
        labelKey: "title",
        inTable: true,
        required: true,
      },
      { key: "floorNumber", label: "Floor number", type: "number", inTable: true, required: true },
{ key: "name", label: "Floor name", ownerEditable: true },
{ key: "totalUnits", label: "Total units", type: "number", inTable: true, ownerEditable: true },
{ key: "totalArea", label: "Total area (sqft)", type: "number", inTable: true, ownerEditable: true },      
{ key: "areaUnit", label: "Area unit", placeholder: "sqft" },
      {
  key: "status",
  label: "Status",
  type: "select",
  options: ["draft", "active", "inactive", "maintenance"],
  inTable: true,
  badge: true,ownerEditable: true,
},
      { key: "description", label: "Description", type: "textarea", ownerEditable: true },
    ],
    seed: [],
  },

  units: {
    key: "units",
    title: "Units",
    singular: "Unit",
    description: "Units carved out of a floor — owners manage their own units directly.",
    apiBacked: true,
    fields: [
      {
        key: "floorId",
        label: "Floor",
        type: "entity-select",
        sourceResource: "floors",
        labelKey: "floorNumber",
        inTable: true,
        required: true,
      },
      { key: "unitCode", label: "Unit code", inTable: true, required: true, ownerEditable: true },
      {
        key: "unitType",
        label: "Unit type",
        type: "select",
        options: ["apartment", "office", "shop", "parking", "common"],
        inTable: true,
        ownerEditable: true,
      },
      { key: "areaSize", label: "Area size (sqft)", type: "number", inTable: true, required: true, ownerEditable: true },
   { key: "bedrooms", label: "Bedrooms", type: "number", inTable: true, ownerEditable: true, hideForUnitTypes: ["parking", "common"] },
{ key: "bathrooms", label: "Bathrooms", type: "number", inTable: true, ownerEditable: true, hideForUnitTypes: ["parking", "common"] },
{ key: "hasKitchen", label: "Kitchen", type: "boolean", inTable: true, ownerEditable: true, hideForUnitTypes: ["parking", "common"] },
{ key: "hasBalcony", label: "Balcony", type: "boolean", inTable: true, ownerEditable: true, hideForUnitTypes: ["parking", "common"] },
{ key: "rent", label: "Monthly rent", type: "money", inTable: true, ownerEditable: true, hideForUnitTypes: ["parking"] },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["vacant", "occupied", "reserved", "maintenance"],
        inTable: true,
        badge: true,
        ownerEditable: true,
      },
    ],
    seed: [],
  },

  amenities: def(
    "amenities",
    "Amenities",
    "Amenity",
    "Shared facilities available in each building.",
    [
      { key: "name", label: "Amenity", inTable: true },
      { key: "building", label: "Building", type: "select", options: BUILDINGS, inTable: true },
      { key: "capacity", label: "Capacity", type: "number", inTable: true },
      { key: "chargeable", label: "Charge", type: "money", inTable: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["Available", "Closed", "Under maintenance"],
        inTable: true,
        badge: true,
      },
    ],
    [
      { name: "Rooftop garden", building: "Emerald Heights", capacity: 60, chargeable: 0, status: "Available" },
      { name: "Gym", building: "Emerald Heights", capacity: 25, chargeable: 1500, status: "Available" },
      { name: "Underground parking", building: "Slate Tower", capacity: 90, chargeable: 3000, status: "Available" },
      { name: "Conference hall", building: "Uttara Business Park", capacity: 80, chargeable: 5000, status: "Under maintenance" },
      { name: "Swimming pool", building: "Riverside Court", capacity: 30, chargeable: 2000, status: "Closed" },
    ],
  ),

  tenants: def(
    "tenants",
    "Tenants",
    "Tenant",
    "Tenant profiles, identity documents and move-in / move-out state.",
    [
      { key: "name", label: "Full name", inTable: true },
      { key: "phone", label: "Phone", inTable: true },
      { key: "email", label: "Email", inTable: true },
      { key: "unit", label: "Unit", inTable: true },
      { key: "docType", label: "ID document", type: "select", options: ["NID", "Passport", "Driving licence"], inTable: true },
      { key: "docNumber", label: "Document number" },
      { key: "moveIn", label: "Move-in date", type: "date", inTable: true },
      { key: "moveOut", label: "Move-out date", type: "date" },
      { key: "role", label: "Tenancy role", type: "select", options: ["Primary tenant", "Co-tenant"], inTable: true },
      { key: "status", label: "Status", type: "select", options: ["Active", "Notice served", "Moved out"], inTable: true, badge: true },
    ],
    [
      { name: "Tanvir Ahmed", phone: "+8801711223344", email: "tanvir@example.com", unit: "EH-4B", docType: "NID", docNumber: "1990123456789", moveIn: "2024-03-01", moveOut: "", role: "Primary tenant", status: "Active" },
      { name: "Sadia Rahman", phone: "+8801799887766", email: "sadia@example.com", unit: "EH-4B", docType: "Passport", docNumber: "BX0912345", moveIn: "2024-03-01", moveOut: "", role: "Co-tenant", status: "Active" },
      { name: "Bright Logic Ltd.", phone: "+8801555667788", email: "ops@brightlogic.io", unit: "ST-12C", docType: "NID", docNumber: "1985222333444", moveIn: "2023-08-15", moveOut: "", role: "Primary tenant", status: "Active" },
      { name: "Mahmudul Hasan", phone: "+8801611445566", email: "mahmud@example.com", unit: "RC-2A", docType: "NID", docNumber: "1992777888999", moveIn: "2022-01-10", moveOut: "2026-02-28", role: "Primary tenant", status: "Notice served" },
    ],
  ),

  leases: def(
    "leases",
    "Leases",
    "Lease",
    "Agreements, renewals, escalation schedules and deposits.",
    [
      { key: "reference", label: "Agreement no.", inTable: true },
      { key: "tenant", label: "Tenant", inTable: true },
      { key: "unit", label: "Unit", inTable: true },
      { key: "startDate", label: "Start date", type: "date", inTable: true },
      { key: "endDate", label: "End date", type: "date", inTable: true },
      { key: "rent", label: "Monthly rent", type: "money", inTable: true },
      { key: "deposit", label: "Security deposit", type: "money", inTable: true },
      { key: "escalation", label: "Yearly escalation %", type: "number", inTable: true },
      { key: "noticePeriod", label: "Notice period (days)", type: "number" },
      { key: "signature", label: "Signing status", type: "select", options: ["Draft", "Sent for signature", "Signed"], inTable: true, badge: true },
    ],
    [
      { reference: "AGR-2024-011", tenant: "Tanvir Ahmed", unit: "EH-4B", startDate: "2024-03-01", endDate: "2026-02-28", rent: 42000, deposit: 126000, escalation: 5, noticePeriod: 60, signature: "Signed" },
      { reference: "AGR-2023-044", tenant: "Bright Logic Ltd.", unit: "ST-12C", startDate: "2023-08-15", endDate: "2026-08-14", rent: 96000, deposit: 288000, escalation: 7, noticePeriod: 90, signature: "Signed" },
      { reference: "AGR-2026-002", tenant: "Rafiq Enterprise", unit: "ST-G2", startDate: "2026-09-01", endDate: "2027-08-31", rent: 38000, deposit: 76000, escalation: 5, noticePeriod: 30, signature: "Sent for signature" },
    ],
  ),

  invoices: def(
    "invoices",
    "Rent & Billing",
    "Invoice",
    "Monthly rent invoices, penalties, partial payments and receipts.",
    [
      { key: "number", label: "Invoice no.", inTable: true },
      { key: "tenant", label: "Tenant", inTable: true },
      { key: "unit", label: "Unit", inTable: true },
      { key: "period", label: "Billing period", placeholder: "2026-08", inTable: true },
      { key: "rent", label: "Rent", type: "money", inTable: true },
      { key: "utilities", label: "Utilities & service charge", type: "money", inTable: true },
      { key: "penalty", label: "Late penalty", type: "money", inTable: true },
      { key: "paid", label: "Amount paid", type: "money", inTable: true },
      { key: "dueDate", label: "Due date", type: "date", inTable: true },
      { key: "status", label: "Status", type: "select", options: ["Paid", "Partially paid", "Unpaid", "Overdue"], inTable: true, badge: true },
    ],
    [
      { number: "INV-2608-001", tenant: "Tanvir Ahmed", unit: "EH-4B", period: "2026-08", rent: 42000, utilities: 4800, penalty: 0, paid: 46800, dueDate: "2026-08-05", status: "Paid" },
      { number: "INV-2608-002", tenant: "Bright Logic Ltd.", unit: "ST-12C", period: "2026-08", rent: 96000, utilities: 12400, penalty: 0, paid: 60000, dueDate: "2026-08-05", status: "Partially paid" },
      { number: "INV-2607-014", tenant: "Mahmudul Hasan", unit: "RC-2A", period: "2026-07", rent: 31000, utilities: 3600, penalty: 1550, paid: 0, dueDate: "2026-07-05", status: "Overdue" },
      { number: "INV-2608-003", tenant: "Nordic Trade Co.", unit: "UBP-5D", period: "2026-08", rent: 78000, utilities: 9100, penalty: 0, paid: 0, dueDate: "2026-08-10", status: "Unpaid" },
    ],
  ),

  maintenance: def(
    "maintenance",
    "Maintenance",
    "Work order",
    "Tenant requests, preventive schedules and common-area upkeep.",
    [
      { key: "title", label: "Issue / task", inTable: true },
      { key: "building", label: "Building", type: "select", options: BUILDINGS, inTable: true },
      { key: "unit", label: "Unit / area", inTable: true },
      { key: "category", label: "Category", type: "select", options: ["Tenant request", "Preventive", "Common area"], inTable: true },
      { key: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Urgent"], inTable: true },
      { key: "assignee", label: "Assigned to", inTable: true },
      { key: "scheduledFor", label: "Scheduled for", type: "date", inTable: true },
      { key: "cost", label: "Cost", type: "money", inTable: true },
      { key: "status", label: "Status", type: "select", options: ["Open", "In progress", "Completed", "Cancelled"], inTable: true, badge: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [
      { title: "Water leak in master bathroom", building: "Emerald Heights", unit: "EH-4B", category: "Tenant request", priority: "High", assignee: "Jamal (plumber)", scheduledFor: "2026-08-12", cost: 3500, status: "In progress", notes: "Tenant reported dripping from ceiling pipe." },
      { title: "Generator servicing", building: "Slate Tower", unit: "Basement", category: "Preventive", priority: "Medium", assignee: "PowerCare Ltd.", scheduledFor: "2026-08-20", cost: 18000, status: "Open", notes: "Quarterly service contract." },
      { title: "Lobby repainting", building: "Riverside Court", unit: "Lobby", category: "Common area", priority: "Low", assignee: "ColorHouse", scheduledFor: "2026-07-30", cost: 42000, status: "Completed", notes: "" },
      { title: "Lift emergency alarm fault", building: "Uttara Business Park", unit: "Lift 2", category: "Preventive", priority: "Urgent", assignee: "OTIS service", scheduledFor: "2026-08-11", cost: 9500, status: "Open", notes: "" },
    ],
  ),

  visitors: def(
    "visitors",
    "Visitors & Security",
    "Log entry",
    "Visitor log, deliveries, guard roster and incident reports.",
    [
      { key: "name", label: "Visitor / courier", inTable: true },
      { key: "building", label: "Building", type: "select", options: BUILDINGS, inTable: true },
      { key: "unit", label: "Visiting unit", inTable: true },
      { key: "purpose", label: "Purpose", type: "select", options: ["Guest", "Delivery", "Contractor", "Incident"], inTable: true },
      { key: "entryTime", label: "Entry", placeholder: "2026-08-11 14:20", inTable: true },
      { key: "exitTime", label: "Exit", placeholder: "2026-08-11 15:05", inTable: true },
      { key: "guard", label: "Guard on duty", inTable: true },
      { key: "status", label: "Status", type: "select", options: ["Inside", "Checked out", "Denied"], inTable: true, badge: true },
      { key: "notes", label: "Notes / incident detail", type: "textarea" },
    ],
    [
      { name: "Arif Chowdhury", building: "Emerald Heights", unit: "EH-4B", purpose: "Guest", entryTime: "2026-08-11 14:20", exitTime: "", guard: "Shahin (Shift A)", status: "Inside", notes: "" },
      { name: "Pathao Courier", building: "Slate Tower", unit: "ST-12C", purpose: "Delivery", entryTime: "2026-08-11 11:05", exitTime: "2026-08-11 11:18", guard: "Bashir (Shift A)", status: "Checked out", notes: "Parcel handed to reception." },
      { name: "Unknown vehicle", building: "Riverside Court", unit: "Gate", purpose: "Incident", entryTime: "2026-08-09 22:40", exitTime: "2026-08-09 22:45", guard: "Rubel (Shift C)", status: "Denied", notes: "Attempted entry without pass; police notified." },
    ],
  ),

  parking: def(
    "parking",
    "Parking",
    "Parking slot",
    "Slot allocation per unit, visitor parking and fees.",
    [
      { key: "slot", label: "Slot no.", inTable: true },
      { key: "building", label: "Building", type: "select", options: BUILDINGS, inTable: true },
      {
        key: "type",
        label: "Slot type",
        type: "select",
        options: ["Resident", "Visitor", "Staff"],
        inTable: true,
      },
      { key: "unit", label: "Assigned unit", inTable: true },
      { key: "vehicle", label: "Vehicle no.", inTable: true },
      { key: "fee", label: "Monthly fee", type: "money", inTable: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["Assigned", "Free", "Blocked"],
        inTable: true,
        badge: true,
      },
    ],
    [
      {
        slot: "B1-014",
        building: "Emerald Heights",
        type: "Resident",
        unit: "EH-4B",
        vehicle: "DHA-KA-12-3456",
        fee: 2500,
        status: "Assigned",
      },
      {
        slot: "B1-015",
        building: "Emerald Heights",
        type: "Visitor",
        unit: "-",
        vehicle: "",
        fee: 100,
        status: "Free",
      },
      {
        slot: "B2-007",
        building: "Slate Tower",
        type: "Resident",
        unit: "ST-12C",
        vehicle: "DHA-METRO-GA-88",
        fee: 3000,
        status: "Assigned",
      },
      {
        slot: "G-002",
        building: "Uttara Business Park",
        type: "Staff",
        unit: "-",
        vehicle: "",
        fee: 0,
        status: "Blocked",
      },
    ],
  ),
  staff: def(
    "staff",
    "Staff",
    "Staff member",
    "Building-wise staff, duty schedule and attendance.",
    [
      { key: "name", label: "Name", inTable: true },
      { key: "role", label: "Role", type: "select", options: ["Guard", "Cleaner", "Electrician", "Plumber", "Manager"], inTable: true },
      { key: "building", label: "Building", type: "select", options: BUILDINGS, inTable: true },
      { key: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "Night", "General"], inTable: true },
      { key: "phone", label: "Phone", inTable: true },
      { key: "salary", label: "Monthly salary", type: "money", inTable: true },
      { key: "attendance", label: "Attendance this month (days)", type: "number", inTable: true },
      { key: "status", label: "Status", type: "select", options: ["On duty", "Off duty", "On leave"], inTable: true, badge: true },
    ],
    [
      { name: "Shahin Alam", role: "Guard", building: "Emerald Heights", shift: "Morning", phone: "+8801811112222", salary: 16000, attendance: 10, status: "On duty" },
      { name: "Rubel Mia", role: "Guard", building: "Riverside Court", shift: "Night", phone: "+8801833334444", salary: 17000, attendance: 9, status: "Off duty" },
      { name: "Kulsum Begum", role: "Cleaner", building: "Slate Tower", shift: "General", phone: "+8801855556666", salary: 12000, attendance: 11, status: "On duty" },
      { name: "Jamal Uddin", role: "Electrician", building: "Uttara Business Park", shift: "General", phone: "+8801877778888", salary: 22000, attendance: 8, status: "On leave" },
    ],
  ),

  utilities: def(
    "utilities",
    "Utilities",
    "Meter reading",
    "Meter readings, bill calculation and vendor tracking.",
    [
      { key: "unit", label: "Unit / area", inTable: true },
      { key: "building", label: "Building", type: "select", options: BUILDINGS, inTable: true },
      { key: "utility", label: "Utility", type: "select", options: ["Electricity", "Gas", "Water", "Service charge"], inTable: true },
      { key: "vendor", label: "Vendor", inTable: true },
      { key: "period", label: "Period", placeholder: "2026-08", inTable: true },
      { key: "previous", label: "Previous reading", type: "number", inTable: true },
      { key: "current", label: "Current reading", type: "number", inTable: true },
      { key: "rate", label: "Unit rate", type: "number", inTable: true },
      { key: "amount", label: "Amount", type: "money", inTable: true },
      { key: "status", label: "Status", type: "select", options: ["Billed", "Pending", "Paid"], inTable: true, badge: true },
    ],
    [
      { unit: "EH-4B", building: "Emerald Heights", utility: "Electricity", vendor: "DPDC", period: "2026-08", previous: 10420, current: 10695, rate: 8.5, amount: 2337, status: "Billed" },
      { unit: "ST-12C", building: "Slate Tower", utility: "Electricity", vendor: "DPDC", period: "2026-08", previous: 42210, current: 43510, rate: 8.5, amount: 11050, status: "Pending" },
      { unit: "Common area", building: "Emerald Heights", utility: "Water", vendor: "Dhaka WASA", period: "2026-08", previous: 880, current: 1010, rate: 15, amount: 1950, status: "Paid" },
      { unit: "RC-2A", building: "Riverside Court", utility: "Gas", vendor: "Titas Gas", period: "2026-08", previous: 0, current: 0, rate: 0, amount: 1080, status: "Billed" },
    ],
  ),

  owners: def(
    "owners",
    "Owners & Investors",
    "Owner",
    "Ownership records, dues, profit sharing and statements.",
    [
      { key: "name", label: "Owner", inTable: true },
      { key: "unit", label: "Unit owned", inTable: true },
      { key: "building", label: "Building", type: "select", options: BUILDINGS, inTable: true },
      { key: "share", label: "Ownership share %", type: "number", inTable: true },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email", inTable: true },
      { key: "payout", label: "Monthly payout", type: "money", inTable: true },
      { key: "dues", label: "Outstanding dues", type: "money", inTable: true },
      { key: "status", label: "Payout status", type: "select", options: ["Settled", "Pending", "On hold"], inTable: true, badge: true },
    ],
    [
      { name: "Kamrul Islam", unit: "EH-4B", building: "Emerald Heights", share: 100, phone: "+8801700000001", email: "kamrul@example.com", payout: 37800, dues: 0, status: "Settled" },
      { name: "Shirin Akhter", unit: "ST-12C", building: "Slate Tower", share: 60, phone: "+8801700000002", email: "shirin@example.com", payout: 51840, dues: 12000, status: "Pending" },
      { name: "Delta Holdings", unit: "UBP-5D", building: "Uttara Business Park", share: 100, phone: "+8801700000003", email: "invest@deltaholdings.com", payout: 70200, dues: 0, status: "On hold" },
    ],
  ),

  expenses: def(
    "expenses",
    "Expenses",
    "Expense",
    "Operating expenses logged per building.",
    [
      { key: "title", label: "Expense", inTable: true },
      { key: "building", label: "Building", type: "select", options: BUILDINGS, inTable: true },
      { key: "category", label: "Category", type: "select", options: ["Utilities", "Maintenance", "Salary", "Supplies", "Other"], inTable: true },
      { key: "amount", label: "Amount", type: "money", inTable: true },
      { key: "date", label: "Date", type: "date", inTable: true },
      { key: "paidBy", label: "Paid by", inTable: true },
      { key: "status", label: "Status", type: "select", options: ["Paid", "Pending"], inTable: true, badge: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [
      { title: "Elevator servicing", building: "Emerald Heights", category: "Maintenance", amount: 15000, date: "2026-08-05", paidBy: "Manager - Rashed Karim", status: "Paid", notes: "" },
      { title: "Security guard salaries", building: "Slate Tower", category: "Salary", amount: 68000, date: "2026-08-01", paidBy: "Manager - Nusrat Jahan", status: "Paid", notes: "August payroll for 4 guards." },
      { title: "Cleaning supplies", building: "Riverside Court", category: "Supplies", amount: 4200, date: "2026-08-10", paidBy: "Manager - Imran Hossain", status: "Pending", notes: "" },
    ],
  ),

  emergencyContacts: def(
    "emergencyContacts",
    "Emergency Contacts",
    "Contact",
    "Emergency contacts per building — fire, police, medical, vendors.",
    [
      { key: "name", label: "Contact name", inTable: true },
      { key: "building", label: "Building", type: "select", options: BUILDINGS, inTable: true },
      { key: "category", label: "Category", type: "select", options: ["Fire service", "Police", "Ambulance", "Electrician", "Plumber", "Other"], inTable: true },
      { key: "phone", label: "Phone", inTable: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [
      { name: "Dhaka Fire Service - Gulshan", building: "Emerald Heights", category: "Fire service", phone: "999", notes: "" },
      { name: "Jamal (on-call electrician)", building: "Slate Tower", category: "Electrician", phone: "+8801911223344", notes: "Available 24/7 for emergency callouts." },
    ],
  ),

  flatStatus: def(
    "flatStatus",
    "Flat Status",
    "Flat",
    "Live occupancy and condition status per flat, owner-facing view.",
    [
      { key: "unit", label: "Unit", inTable: true },
      { key: "building", label: "Building", type: "select", options: BUILDINGS, inTable: true },
      { key: "occupancy", label: "Occupancy", type: "select", options: ["Occupied", "Vacant", "Reserved"], inTable: true, badge: true },
      { key: "condition", label: "Condition", type: "select", options: ["Good", "Needs attention", "Under repair"], inTable: true, badge: true },
      { key: "lastInspected", label: "Last inspected", type: "date", inTable: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [
      { unit: "EH-4B", building: "Emerald Heights", occupancy: "Occupied", condition: "Good", lastInspected: "2026-07-15", notes: "" },
      { unit: "RC-2A", building: "Riverside Court", occupancy: "Occupied", condition: "Under repair", lastInspected: "2026-08-01", notes: "Bathroom leak reported, work order open." },
    ],
  ),

  notices: def(
    "notices",
    "Notices",
    "Notice",
    "Announcements posted to owners and managers.",
    [
      { key: "title", label: "Title", inTable: true },
      { key: "audience", label: "Audience", type: "select", options: ["All", "Owners", "Managers"], inTable: true },
      { key: "postedDate", label: "Posted", type: "date", inTable: true },
      { key: "priority", label: "Priority", type: "select", options: ["Normal", "Important", "Urgent"], inTable: true, badge: true },
      { key: "body", label: "Message", type: "textarea" },
    ],
    [
      { title: "Water supply maintenance - Aug 20", audience: "All", postedDate: "2026-08-15", priority: "Important", body: "Water supply will be interrupted 10am-2pm for tank cleaning across all buildings." },
      { title: "Updated maintenance approval process", audience: "Managers", postedDate: "2026-08-10", priority: "Normal", body: "All maintenance requests above 10,000 BDT now require owner approval before work begins." },
    ],
  ),

  subscriptions: def(
    "subscriptions",
    "Subscription",
    "Plan",
    "Platform subscription plan and billing.",
    [
      { key: "plan", label: "Plan", inTable: true },
      { key: "billingCycle", label: "Billing cycle", type: "select", options: ["Monthly", "Yearly"], inTable: true },
      { key: "amount", label: "Amount", type: "money", inTable: true },
      { key: "nextBillingDate", label: "Next billing date", type: "date", inTable: true },
      { key: "status", label: "Status", type: "select", options: ["Active", "Past due", "Cancelled"], inTable: true, badge: true },
    ],
    [
      { plan: "EstateOps Pro", billingCycle: "Monthly", amount: 4900, nextBillingDate: "2026-09-01", status: "Active" },
    ],
  ),

  buildingAccounts: def(
    "buildingAccounts",
    "Building Accounts",
    "Account",
    "Per-building financial summary — balance, income and expenses.",
    [
      { key: "building", label: "Building", type: "select", options: BUILDINGS, inTable: true },
      { key: "balance", label: "Current balance", type: "money", inTable: true },
      { key: "monthlyIncome", label: "Monthly income", type: "money", inTable: true },
      { key: "monthlyExpense", label: "Monthly expense", type: "money", inTable: true },
      { key: "lastReconciled", label: "Last reconciled", type: "date", inTable: true },
    ],
    [
      { building: "Emerald Heights", balance: 452000, monthlyIncome: 189000, monthlyExpense: 83000, lastReconciled: "2026-08-01" },
      { building: "Slate Tower", balance: 611000, monthlyIncome: 296000, monthlyExpense: 142000, lastReconciled: "2026-08-01" },
    ],
  ),
};

export const resourceKeys = Object.keys(resources);