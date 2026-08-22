package com.example.doctorappointment.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.doctorappointment.api.ApiModule
import com.example.doctorappointment.model.AttendanceUpdateRequest
import com.example.doctorappointment.model.Doctor
import com.example.doctorappointment.model.Hospital
import com.example.doctorappointment.model.LiveQueueResponse
import kotlinx.coroutines.launch
import java.time.LocalDate

data class AppUiState(
    val loading: Boolean = true,
    val doctors: List<Doctor> = emptyList(),
    val hospitals: List<Hospital> = emptyList(),
    val liveQueue: LiveQueueResponse? = null,
    val error: String? = null
)

class AppViewModel : ViewModel() {
    var uiState = androidx.compose.runtime.mutableStateOf(AppUiState())
        private set

    init {
        refresh()
    }

    fun refresh() {
        uiState.value = uiState.value.copy(loading = true, error = null)
        viewModelScope.launch {
            try {
                val doctors = ApiModule.service.getDoctors().doctors
                val hospitals = ApiModule.service.getHospitals().hospitals
                val liveQueue = ApiModule.service.getLiveQueue(LocalDate.now().toString())
                uiState.value = AppUiState(
                    loading = false,
                    doctors = doctors,
                    hospitals = hospitals,
                    liveQueue = liveQueue,
                    error = null
                )
            } catch (e: Exception) {
                uiState.value = AppUiState(
                    loading = false,
                    doctors = emptyList(),
                    hospitals = emptyList(),
                    error = e.message ?: "Failed to load data"
                )
            }
        }
    }

    fun updateAttendance(appointmentId: String, attendanceStatus: String) {
        viewModelScope.launch {
            try {
                val response = ApiModule.service.updateAttendance(
                    appointmentId,
                    AttendanceUpdateRequest(attendanceStatus)
                )
                uiState.value = uiState.value.copy(liveQueue = response.queue)
            } catch (e: Exception) {
                uiState.value = uiState.value.copy(error = e.message ?: "Failed to update attendance")
            }
        }
    }
}
