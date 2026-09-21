import {withApiAuth} from "@/lib/server/api-route";
import {recordMeasurement} from "@/lib/server/record-measurement";
export const POST=withApiAuth((req,{user})=>recordMeasurement(req,user,false),{access:"member"});
export const dynamic="force-dynamic";
