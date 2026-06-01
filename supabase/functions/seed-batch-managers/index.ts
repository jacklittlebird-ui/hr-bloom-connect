import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
}

const STATIONS = {
  HQ1: '2ec5cca3-db74-49be-b0d2-451e1e9f649b',
  HQ2: '2fb34a1d-2d98-4331-b391-52f36228d2f3',
  IGS: '386d2b01-df03-4aa9-a2c0-4d9ddab57c20',
  HURGHADA: '427cfde2-383d-44fa-b86a-1f7656627136',
}

const DEPTS = {
  OPERATIONS: '2d25d1f6-9945-42ec-ad9a-dafb820457e7',
  AP: '921e97f7-ee29-49c6-bab6-787cfc5fe244',
  AR: '2c22c447-c4d9-439e-93b7-cd492d0f775e',
  COMMERCIAL: 'f1ee33ed-7dbf-4b3b-a776-a51ba1d788cd',
  SAFETY: 'dc52d9af-f198-42b8-9695-7def5fdc7161',
  INTL: '3b466a36-cc87-4868-a0e7-735fc545e6fe',
  SECURITY: '7d9b83a4-f288-482c-8901-ee2d3e416d80',
  PAX: '6f28f4c8-3ac2-42e6-8a63-cdd36a356435',
}

type Account = {
  email: string
  password: string
  full_name: string
  role: 'station_manager' | 'department_manager'
  station_id: string
  department_ids?: string[]
}

const ACCOUNTS: Account[] = [
  { email: 'glob@onehr.com', password: 'Glo#55441da', full_name: 'مدير محطة IGS', role: 'station_manager', station_id: STATIONS.IGS },
  { email: 'opshdq@onehr.com', password: 'Ops#88771hf', full_name: 'مدير قسم العمليات - HQ2', role: 'department_manager', station_id: STATIONS.HQ2, department_ids: [DEPTS.OPERATIONS] },
  { email: 'acchdq@onehr.com', password: 'Acc#66441gs', full_name: 'مدير حسابات المدفوعات والتحصيلات - HQ1', role: 'department_manager', station_id: STATIONS.HQ1, department_ids: [DEPTS.AP, DEPTS.AR] },
  { email: 'con@onehr.com', password: 'Con#88771sd', full_name: 'مدير قسم التجاري - HQ2', role: 'department_manager', station_id: STATIONS.HQ2, department_ids: [DEPTS.COMMERCIAL] },
  { email: 'opssaf@onehr.com', password: 'Ops#44771sd', full_name: 'مدير السلامة والجودة - HQ2', role: 'department_manager', station_id: STATIONS.HQ2, department_ids: [DEPTS.SAFETY] },
  { email: 'intl@onehr.com', password: 'Intl#66441hg', full_name: 'مدير العلاقات الخارجية - HQ2', role: 'department_manager', station_id: STATIONS.HQ2, department_ids: [DEPTS.INTL] },
  { email: 'sechdq@onehr.com', password: 'Sec#55441hg', full_name: 'مدير خدمات الأمن - HQ2', role: 'department_manager', station_id: STATIONS.HQ2, department_ids: [DEPTS.SECURITY] },
  { email: 'hanhrg@hr.com', password: 'Hrg#558918er', full_name: 'مدير خدمة الركاب - الغردقة', role: 'department_manager', station_id: STATIONS.HURGHADA, department_ids: [DEPTS.PAX] },
]

async function findAuthUserByEmail(admin: any, email: string) {
  const norm = email.trim().toLowerCase()
  let page = 1
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const u = (data.users ?? []).find((x: any) => x.email?.trim().toLowerCase() === norm)
    if (u) return u
    if ((data.users ?? []).length < 200) return null
    page++
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const results: any[] = []

  for (const acc of ACCOUNTS) {
    try {
      let existing = await findAuthUserByEmail(admin, acc.email)
      let userId = existing?.id
      let created = false

      if (!userId) {
        const { data, error } = await admin.auth.admin.createUser({
          email: acc.email,
          password: acc.password,
          email_confirm: true,
          user_metadata: { full_name: acc.full_name },
        })
        if (error) { results.push({ email: acc.email, status: 'error', error: error.message }); continue }
        userId = data.user.id
        created = true
      } else {
        // Update password to match requested
        await admin.auth.admin.updateUserById(userId, { password: acc.password })
      }

      await admin.from('profiles').upsert({ id: userId, email: acc.email, full_name: acc.full_name }, { onConflict: 'id' })

      const { error: roleErr } = await admin.from('user_roles').upsert({
        user_id: userId,
        role: acc.role,
        station_id: acc.station_id,
        department_id: acc.role === 'department_manager' && acc.department_ids?.length ? acc.department_ids[0] : null,
      }, { onConflict: 'user_id,role' })

      if (roleErr) { results.push({ email: acc.email, status: 'error', error: roleErr.message }); continue }

      if (acc.role === 'department_manager' && acc.department_ids?.length) {
        const rows = acc.department_ids.map(d => ({ user_id: userId, department_id: d }))
        await admin.from('department_manager_departments').upsert(rows, { onConflict: 'user_id,department_id' })
      }

      results.push({ email: acc.email, status: created ? 'created' : 'updated', user_id: userId })
    } catch (e: any) {
      results.push({ email: acc.email, status: 'error', error: e.message })
    }
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
