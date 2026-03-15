package com.example.doctorappointment.api

import com.example.doctorappointment.model.DoctorsResponse
import com.example.doctorappointment.model.HospitalsResponse
import retrofit2.http.GET

interface DoctorApiService {
    @GET("api/doctors")
    suspend fun getDoctors(): DoctorsResponse

    @GET("api/hospitals")
    suspend fun getHospitals(): HospitalsResponse
}
