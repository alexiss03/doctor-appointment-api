package com.example.doctorappointment.model

data class Doctor(
    val id: String,
    val hospitalId: String? = null,
    val hospitalName: String? = null,
    val name: String,
    val specialty: String,
    val experience: Int,
    val fee: Int,
    val location: String,
    val rating: Double,
    val category: String,
    val symptoms: List<String>,
    val bio: String,
    val availableSlots: List<String>,
    val chatAvailable: Boolean,
    val image: String,
    val favorite: Boolean? = null
)

data class HospitalDoctorSummary(
    val id: String,
    val name: String,
    val specialty: String,
    val category: String,
    val experience: Int,
    val rating: Double
)

data class Hospital(
    val id: String,
    val name: String,
    val city: String,
    val state: String,
    val address: String,
    val doctorCount: Int,
    val specializations: List<String>,
    val doctors: List<HospitalDoctorSummary>
)

data class Patient(
    val id: String,
    val name: String,
    val email: String
)

data class Appointment(
    val id: String,
    val userId: String,
    val doctorId: String,
    val date: String,
    val time: String,
    val status: String,
    val attendanceStatus: String? = null,
    val reason: String,
    val doctor: Doctor? = null,
    val patient: Patient? = null
)

data class LiveQueueCounts(
    val checkedIn: Int,
    val waiting: Int,
    val inConsultation: Int,
    val attended: Int
)

data class DoctorQueue(
    val doctor: Doctor,
    val counts: LiveQueueCounts,
    val appointments: List<Appointment>
)

data class LiveQueueResponse(
    val date: String,
    val counts: LiveQueueCounts,
    val appointments: List<Appointment>,
    val doctors: List<DoctorQueue>
)

data class AttendanceUpdateRequest(val attendanceStatus: String)

data class LiveQueueUpdateResponse(
    val appointment: Appointment,
    val queue: LiveQueueResponse
)

data class DoctorsResponse(val doctors: List<Doctor>)

data class HospitalsResponse(val hospitals: List<Hospital>)
