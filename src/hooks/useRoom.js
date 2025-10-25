import { useMutation, useQuery } from "@tanstack/react-query"
import axios from "axios"

export const useCreateSession=()=>{
    return useMutation({
        mutationFn:async(payLoad)=>{
            console.log({payLoad});
           const res= await axios.post("https://34.93.216.76:3000/room/create-room",payLoad)
           return res.data
        },
        mutationKey:["createSession"]
        
    })
}
export const useGetSessionById=(sessionId)=>{
    return useQuery({
        queryFn:async()=>{
            console.log({sessionId});
           const res= await axios.get(`https://34.93.216.76:3000/room/${sessionId}`)
           return res.data
        },
        queryKey:["getSession"]
        
    })
}