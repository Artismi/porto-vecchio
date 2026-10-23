// /api/mente — la stessa di v7/api/mente.js, su Netlify
import handler from '../../v7/api/mente.js'
import { daVercel } from '../lib/vercel.mjs'

export default daVercel(handler)
export const config = { path: '/api/mente' }
