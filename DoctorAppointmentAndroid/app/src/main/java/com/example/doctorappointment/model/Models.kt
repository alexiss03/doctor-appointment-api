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

data class DoctorsResponse(val doctors: List<Doctor>)

data class HospitalsResponse(val hospitals: List<Hospital>)
