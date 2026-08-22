package com.example.doctorappointment.api

import com.example.doctorappointment.model.DoctorsResponse
import com.example.doctorappointment.model.HospitalsResponse
import com.example.doctorappointment.model.AttendanceUpdateRequest
import com.example.doctorappointment.model.LiveQueueResponse
import com.example.doctorappointment.model.LiveQueueUpdateResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.Path
import retrofit2.http.Query

interface DoctorApiService {
    @GET("api/doctors")
    suspend fun getDoctors(): DoctorsResponse

    @GET("api/hospitals")
    suspend fun getHospitals(): HospitalsResponse

    @GET("api/live-queue")
    suspend fun getLiveQueue(@Query("date") date: String): LiveQueueResponse

    @PATCH("api/live-queue/{id}")
    suspend fun updateAttendance(
        @Path("id") id: String,
        @Body request: AttendanceUpdateRequest
    ): LiveQueueUpdateResponse
}
