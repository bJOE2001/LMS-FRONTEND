import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { api } from 'src/boot/axios'

export const useReportStore = defineStore('reports', () => {
    
    const lwopReports = ref([])
    const  leaveBalanceReports = ref([])
    const  monetizationReports = ref([])
    const  ctoAvailmentReports = ref([])
    const  cocBalanceReports = ref([])
    const  leaveAvailmentReports = ref([])
    const  loading = ref(false)


    const totalNumberofLwopDays = computed(() => lwopReports.value.length)

    async function fetchLwopReports() {
        loading.value = true

        try{
            const { data } = await api.get('/reports/lwopReports')
            lwopReports.value = data
        }catch(error){
            console.error('Error fetching LWOP reports:', error)
        } finally {
            loading.value = false
        }

    }

    async function fetchLeaveBalances(){
        loading.value = true

        try{
            const { data } = await api.get('/reports/leaveBalancesReports')
            leaveBalanceReports.value = data

        }catch(error){

            console.error('Error fetching leave balance reports:', error)
        } finally {
            loading.value = false
        }
    }
    async function fetchMonetizationReports(){
        loading.value = true
        
        try{
            const { data } = await api.get('/reports/monetizationReports')
            monetizationReports.value = data
        }catch(error){

            console.error('Error fetching monetization reports:', error)
        } finally {
            loading.value = false
        }
    }
    async function fetchCtoAvailmentReports(){
        loading.value = true

        try{
            const { data } = await api.get('/reports/ctoAvailmentReports')
            ctoAvailmentReports.value = data
        }catch(error){

            console.error('Error fetching CTO availment reports:', error)
        } finally {
            loading.value = false
        }
    }
    async function fetchCocBalanceReports(){
        loading.value = true

        try{

            const { data } = await api.get('/reports/cocBalanceReports')
            cocBalanceReports.value = data
        }catch(error){

            console.error('Error fetching CoC balance reports:', error)
        } finally {
            loading.value = false
        }
    }
    async function fetchLeaveAvailmentReports(){
        loading.value = true

        try{
            const { data } = await api.get('/reports/leaveAvailmentReports')
            leaveAvailmentReports.value = data
        }catch(error){

            console.error('Error fetching leave availment reports:', error)
        } finally {
            loading.value = false
        }
    }

    return{

        lwopReports,
        leaveBalanceReports,
        monetizationReports,
        ctoAvailmentReports,
        cocBalanceReports,
        leaveAvailmentReports,
        loading,

        totalNumberofLwopDays,

        fetchLwopReports,
        fetchLeaveBalances,
        fetchMonetizationReports,
        fetchCtoAvailmentReports,
        fetchCocBalanceReports,
        fetchLeaveAvailmentReports
    }
})


