import axios from "axios"
import AsyncStorage from "@react-native-async-storage/async-storage"

const BASE_URL = "http://192.168.18.86:8001"

export const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem("token")
    }
    return Promise.reject(error)
  }
)
