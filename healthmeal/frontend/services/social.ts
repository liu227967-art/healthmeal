import { api } from "./api"

export interface ShoppingItem {
  name: string
  quantity: number
  unit: string
  checked: boolean
}

export interface ShoppingListData {
  id: number
  date: string
  items: ShoppingItem[]
  created_at: string
}

export interface FriendshipData {
  id: number
  requester_email: string
  addressee_email: string
  status: string
  created_at: string
}

export async function generateShoppingList(lang = "zh"): Promise<ShoppingListData> {
  const res = await api.post("/shopping-list/generate", { lang })
  return res.data
}

export async function getShoppingLists(): Promise<ShoppingListData[]> {
  const res = await api.get("/shopping-list")
  return res.data
}

export async function sendFriendRequest(email: string): Promise<FriendshipData> {
  const res = await api.post("/friends/request", { email })
  return res.data
}

export async function getFriendRequests(): Promise<FriendshipData[]> {
  const res = await api.get("/friends/requests")
  return res.data
}

export async function acceptFriendRequest(friendshipId: number): Promise<FriendshipData> {
  const res = await api.put(`/friends/requests/${friendshipId}/accept`)
  return res.data
}

export async function getFriends(): Promise<FriendshipData[]> {
  const res = await api.get("/friends")
  return res.data
}
