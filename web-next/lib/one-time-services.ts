export interface OnDemandService {
  type: string
  name: string
  price: string
  paise: number
  desc: string
}

export const ON_DEMAND_SERVICES: OnDemandService[] = [
  {
    type: 'home_visit',
    name: 'Home Visit',
    price: '₹1,000',
    paise: 100000,
    desc: 'In-person wellbeing check, home safety observation, and a family update.',
  },
  {
    type: 'hospital_assistance_half_day',
    name: 'Hospital Assistance (Half Day)',
    price: '₹2,000',
    paise: 200000,
    desc: 'Hospital coordination, registration, and family updates.',
  },
  {
    type: 'hospital_assistance_full_day',
    name: 'Hospital Assistance (Full Day)',
    price: '₹4,000',
    paise: 400000,
    desc: 'End-to-end hospital support, care coordination, and family updates.',
  },
  {
    type: 'emergency_support_visit',
    name: 'Emergency Support Visit',
    price: '₹3,000',
    paise: 300000,
    desc: 'Immediate local response, situation assessment, and family notification.',
  },
  {
    type: 'grocery_medicine_assistance',
    name: 'Grocery or Medicine Assistance',
    price: '₹500',
    paise: 50000,
    desc: 'Purchase coordination, delivery, and confirmation.',
  },
  {
    type: 'home_maintenance_coordination',
    name: 'Home Maintenance Coordination',
    price: '₹500',
    paise: 50000,
    desc: 'Plumber, electrician, or appliance repair coordination.',
  },
]
