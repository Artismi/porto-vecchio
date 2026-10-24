// /api/status — la stessa di v7/api/status.js, su Netlify
import handler from '../../v7/api/status.js'
import { daVercel } from '../lib/vercel.mjs'

export default daVercel(handler)
export const config = { path: '/api/status' }
