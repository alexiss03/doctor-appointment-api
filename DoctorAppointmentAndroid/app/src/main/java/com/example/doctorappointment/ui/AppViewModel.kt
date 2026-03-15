package com.example.doctorappointment.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.doctorappointment.api.ApiModule
import com.example.doctorappointment.model.Doctor
import com.example.doctorappointment.model.Hospital
import kotlinx.coroutines.launch

data class AppUiState(
    val loading: Boolean = true,
    val doctors: List<Doctor> = emptyList(),
    val hospitals: List<Hospital> = emptyList(),
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
                uiState.value = AppUiState(
                    loading = false,
                    doctors = doctors,
                    hospitals = hospitals,
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
}
