// Shared display labels for booking status and service type, used across
// the family, companion, and admin dashboards.

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  requested: 'bg-amber-100 text-amber-700',
  needs_details: 'bg-orange-100 text-orange-700',
  confirmed: 'bg-blue-100 text-blue-700',
  companion_assigned: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export const SERVICE_NAMES: Record<string, string> = {
  // Current on-demand services
  home_visit: 'Home Visit',
  hospital_assistance_half_day: 'Hospital Assistance (Half Day)',
  hospital_assistance_full_day: 'Hospital Assistance (Full Day)',
  emergency_support_visit: 'Emergency Support Visit',
  grocery_medicine_assistance: 'Grocery or Medicine Assistance',
  home_maintenance_coordination: 'Home Maintenance Coordination',
  // Legacy service types — kept so historical bookings still display a label
  doctor_visit_assistance: 'Doctor Visit Assistance',
  companion_visit_single: 'Companion Visit',
  hospital_companion_single: 'Hospital Companion',
  emergency_visit: 'Emergency Visit',
  care_plan_4_monthly: 'Monthly Plan (4 visits)',
  care_plan_8_monthly: 'Monthly Plan (8 visits)',
  care_plan_quarterly: 'Quarterly Plan',
}
