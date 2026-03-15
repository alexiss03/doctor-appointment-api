package com.example.doctorappointment

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.doctorappointment.model.Doctor
import com.example.doctorappointment.model.Hospital
import com.example.doctorappointment.ui.AppViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    DoctorAppointmentApp()
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DoctorAppointmentApp(vm: AppViewModel = viewModel()) {
    val state = vm.uiState.value
    var tabIndex by remember { mutableIntStateOf(0) }
    val tabs = listOf("Doctors", "Hospitals")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Doctor Appointment Mobile") },
                actions = {
                    TextButton(onClick = vm::refresh) { Text("Refresh") }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            TabRow(selectedTabIndex = tabIndex) {
                tabs.forEachIndexed { index, label ->
                    Tab(
                        selected = tabIndex == index,
                        onClick = { tabIndex = index },
                        text = { Text(label) }
                    )
                }
            }

            when {
                state.loading -> LoadingView()
                state.error != null -> ErrorView(state.error)
                tabIndex == 0 -> DoctorsView(state.doctors)
                else -> HospitalsView(state.hospitals)
            }
        }
    }
}

@Composable
private fun LoadingView() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
private fun ErrorView(message: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(text = message)
    }
}

@Composable
private fun DoctorsView(doctors: List<Doctor>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(doctors) { doctor ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.shapes.medium)
                    .padding(12.dp)
            ) {
                Text(doctor.name, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(4.dp))
                Text("Specialization: ${doctor.specialty}")
                Text("Hospital: ${doctor.hospitalName ?: "N/A"}")
                Text("Category: ${doctor.category}")
                Text("Experience: ${doctor.experience} years • Rating ${doctor.rating}")
            }
        }
    }
}

@Composable
private fun HospitalsView(hospitals: List<Hospital>) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        items(hospitals) { hospital ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceVariant, MaterialTheme.shapes.medium)
                    .padding(12.dp)
            ) {
                Text(hospital.name, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(4.dp))
                Text("${hospital.address}, ${hospital.city}, ${hospital.state}")
                Text("Doctors: ${hospital.doctorCount}")
                Text("Specializations: ${hospital.specializations.joinToString()}")
                Spacer(Modifier.height(6.dp))
                hospital.doctors.forEach { doctor ->
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Text("• ${doctor.name}")
                        Spacer(Modifier.width(8.dp))
                        Text("(${doctor.specialty})")
                    }
                }
            }
        }
    }
}
