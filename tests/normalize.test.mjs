import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVisit} from '../supabase/functions/connect-admin/normalize.js';
const schema={survey:[
 {$xpath:'field_observation/g_a2b',type:'begin_group',label:['ร่องรอยไฟ']},
 {$xpath:'field_observation/g_a2b/a2b',name:'a2b',type:'select_one',label:['ผลตรวจ'],select_from_list_name:'problem'},
 {$xpath:'economy/g_ep/ep_income_thb',name:'ep_income_thb',type:'decimal',label:['เงินที่ได้รับ (บาท)']},
 {$xpath:'interview_section/informant_code',name:'informant_code',type:'text',label:['รหัสบุคคล']},
 {$xpath:'closeout/sum_trees/finding_trees',name:'finding_trees',type:'text',label:['ข้อค้นพบ']},
 {$xpath:'closeout/sum_trees/action_trees',name:'action_trees',type:'select_multiple',label:['งานต่อ'],select_from_list_name:'action'},
],choices:[{list_name:'problem',name:'not_checked',label:['ยังไม่ตรวจ']},{list_name:'action',name:'routine',label:['ติดตามตามรอบ']},{list_name:'action',name:'more_data',label:['เก็บข้อมูลเพิ่ม']}]};
test('Kobo mapping preserves zero, unknown, choices and project metadata without publishing',()=>{
 const v=normalizeVisit({'identity/plot_id':'TEST-1','identity/visit_date':'2026-11-06','field_observation/g_a2b/a2b':'not_checked','economy/g_ep/ep_income_thb':0,'interview_section/informant_code':'PRIVATE-CODE','closeout/sum_trees/action_trees':'routine more_data'},schema);
 assert.equal(v.status,'draft');assert.equal(v.plot,'TEST-1');assert.equal(v.survey_date,'2026-11-06');
 assert.match(v.ecology,/ยังไม่ตรวจ/);assert.match(v.economics,/เงินที่ได้รับ \(บาท\): 0/);assert.doesNotMatch(JSON.stringify(v),/PRIVATE-CODE/);
 assert.match(v.recommendations,/ติดตามตามรอบ, เก็บข้อมูลเพิ่ม/);assert.equal(v.summary,'');
});
test('missing counts remain missing and invalid dates are not guessed',()=>{const v=normalizeVisit({'identity/visit_date':'ไม่ทราบ'},schema);assert.equal(v.survey_date,null);assert.equal(v.economics,'');assert.equal(v.social,'');assert.equal(v.ecology,'');});
