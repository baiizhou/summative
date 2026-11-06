import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if(req.method === "GET"){
        let rooms = await kv.get("studyRooms");
        if(!rooms){
            const names = [
                "Study Room 1",
                "Study Room 2"
            ];
            rooms = names.map((name,idx)=>({
                id:idx, name, booked:false, startTime:null, endTime:null
            }))
            await kv.set("studyRooms",rooms);
        }
        // Auto release expired booking
        const now = new Date().toISOString();
        let changed = false;
        rooms = rooms.map(r=>{
            if(r.booked && r.endTime < now){
                changed = true;
                return {...r,booked:false,startTime:null,endTime:null}
            }
            return r;
        })
        if(changed) await kv.set("studyRooms",rooms);
        return res.status(200).json(rooms);
    }

    if(req.method === "POST"){
        const {id,start,end} = req.body;
        let rooms = await kv.get("studyRooms");
        if(req.url.includes("/book")){
            if(rooms[id].booked){
                return res.status(200).json({msg:"This room is already booked. Please choose another one."})
            }
            rooms[id] = {...rooms[id], booked:true, startTime:start, endTime:end};
            await kv.set("studyRooms",rooms);
            return res.status(200).json({msg:`✅ Booking confirmed: ${rooms[id].name} | ${start} to ${end}`})
        }
        if(req.url.includes("/cancel")){
            rooms[id] = {...rooms[id], booked:false, startTime:null, endTime:null};
            await kv.set("studyRooms",rooms);
            return res.status(200).json({msg:`🔔 Alert: ${rooms[id].name} is released EARLY. The user left ahead of schedule.`})
        }
    }
    return res.status(404).json({msg:"Route not found"});
}
