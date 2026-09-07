"use client"

import * as React from "react"
import { logClientError } from "@/lib/client-logger"

export type Patient = {
  id: string
  firstName: string
  lastName: string
  dob: string
  phone: string
  email: string
  address: string
  mrn: string
  status: "Active" | "Inactive" | "Archived"
  lastVisit: string
  regDate: string
  gender: string
  bloodType: string
  allergies: string
  familyHistory: string
  primaryCare: string
}

export type Appointment = {
  id: string
  patientId: string
  provider: string
  date: string
  time: string
  duration?: string
  type: string
  status: string
  startTime?: string
  endTime?: string
  tokenNumber?: string
  isWalkIn?: boolean
}

type MedicalContextType = {
  patients: Patient[]
  addPatient: (patient: Omit<Patient, "id" | "mrn" | "regDate">) => void
  refetchPatients: () => Promise<void>
  appointments: Appointment[]
  addAppointment: (appointment: Omit<Appointment, "id">) => void
  updateAppointment: (id: string, appointment: Partial<Appointment>) => void
}

const MedicalContext = React.createContext<MedicalContextType | undefined>(undefined)

// Initial mock data removed as we now fetch securely from the API routes

export function MedicalProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [appointments, setAppointments] = React.useState<Appointment[]>([])

  const fetchData = React.useCallback(async () => {
    try {
      const [patientsRes, apptsRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/appointments')
      ]);
      if (patientsRes.ok) {
        const patientsData = await patientsRes.json();
        setPatients(patientsData);
      }
      if (apptsRes.ok) {
        const apptsData = await apptsRes.json();
        setAppointments(apptsData);
      }
    } catch (error) {
      logClientError("Initial medical data fetch failed", error);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);


  const addPatient = async (patientData: Omit<Patient, "id" | "mrn" | "regDate" | "lastVisit"> & Partial<Patient>) => {
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
      });
      if (res.ok) {
        const newPatient = await res.json();
        setPatients((prev) => [newPatient, ...prev])
      }
    } catch (error) {
      logClientError("Create patient from medical context failed", error);
    }
  }

  const addAppointment = async (appointmentData: Omit<Appointment, "id">) => {
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentData)
      });
      if (res.ok) {
        const newApt = await res.json();
        setAppointments((prev) => [...prev, newApt])
      }
    } catch (error) {
      logClientError("Create appointment from medical context failed", error);
    }
  }

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
       const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
       });
       if (res.ok) {
         const updatedApt = await res.json();
         setAppointments((prev) => prev.map(apt => apt.id === id ? { ...apt, ...updatedApt } : apt))
       }
    } catch (error) {
       logClientError("Update appointment from medical context failed", error);
    }
  }

  const refetchPatients = React.useCallback(async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (error) {
      logClientError("Patient refetch failed", error);
    }
  }, []);

  return (
    <MedicalContext.Provider value={{ patients, addPatient, refetchPatients, appointments, addAppointment, updateAppointment }}>
      {children}
    </MedicalContext.Provider>
  )
}

export function useMedical() {
  const context = React.useContext(MedicalContext)
  if (context === undefined) {
    throw new Error("useMedical must be used within a MedicalProvider")
  }
  return context
}
