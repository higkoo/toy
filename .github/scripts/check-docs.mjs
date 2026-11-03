#!/usr/bin/env node
// Documentation checks for this repository. Zero dependencies.
//
//   node .github/scripts/check-docs.mjs   # local links, anchors, skill refs, required content
//
// Exit code 1 on any error; warnings are printed but do not fail the run.
// Network checks are intentionally out of scope so CI stays offline and deterministic.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'lib', 'coverage'])

let errors = 0
let warnings = 0

const err = (msg) => { errors += 1; console.error(`ERROR ${msg}`) }
const warn = (msg) => { warnings += 1; console.warn(`WARN  ${msg}`) }

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (entry.endsWith('.md')) out.push(full)
  }
  return out
}

/** GitHub slugger, close enough for this repo's headings (CJK kept, punctuation dropped). */
function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s+/g, '-')
}

function headings(file) {
  const text = readFileSync(file, 'utf8')
  const inCode = { value: false }
  const out = []
  for (const line of text.split('\n')) {
    if (line.trimStart().startsWith('```')) { inCode.value = !inCode.value; continue }
    if (inCode.value) continue
    const m = /^(#{1,6})\s+(.*)$/.exec(line)
    if (m) out.push(slug(m[2]))
  }
  return out
}

// Duplicate headings get -1, -2… suffixes in GitHub; model that.
function anchorSet(file) {
  const seen = new Map()
  const set = new Set()
  for (const s of headings(file)) {
    const n = seen.get(s) ?? 0
    set.add(n === 0 ? s : `${s}-${n}`)
    seen.set(s, n + 1)
  }
  return set
}

const files = walk(ROOT)
const md = files.map((f) => ({ file: f, rel: relative(ROOT, f), text: readFileSync(f, 'utf8') }))

// 1) Markdown links: local files must exist, anchors must resolve, http(s) optional.
for (const { file, rel, text } of md) {
  const inCode = { value: false }
  for (const line of text.split('\n')) {
    if (line.trimStart().startsWith('```')) { inCode.value = !inCode.value; continue }
    if (inCode.value) continue
    const re = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
    let m
    while ((m = re.exec(line)) !== null) {
      const target = m[1]
      if (/^(https?:|mailto:|tel:|data:)/.test(target)) continue
      const [pathPart, anchor] = target.split('#')
      const base = pathPart === '' ? file : resolve(dirname(file), decodeURIComponent(pathPart))
      if (!existsSync(base)) {
        err(`${rel}: link target not found: ${target}`)
        continue
      }
      if (anchor !== undefined && base.endsWith('.md')) {
        const set = anchorSet(base)
        if (!set.has(decodeURIComponent(anchor))) {
          err(`${rel}: anchor not found: ${target}`)
        }
      }
    }
  }
}

// 2) SKILL.md: frontmatter name must match the directory, backticked paths must exist.
const skillFiles = md.filter(({ rel }) => /(^|\/)SKILL\.md$/.test(rel))
for (const { file, rel, text } of skillFiles) {
  const dirName = dirname(file).split('/').pop()
  const fm = /^---\n([\s\S]*?)\n---/.exec(text)
  if (!fm) err(`${rel}: missing YAML frontmatter`)
  else {
    const name = /^name:\s*(.+)$/m.exec(fm[1])?.[1]?.trim().replace(/^['"]|['"]$/g, '')
    if (name !== dirName) err(`${rel}: frontmatter name "${name ?? ''}" != directory "${dirName}"`)
    if (!/^description:\s*\S/m.test(fm[1])) err(`${rel}: frontmatter has no description`)
  }
  const refRe = /`((?:references|scripts)\/[^`\s]+)`/g
  let m
  while ((m = refRe.exec(text)) !== null) {
    if (!existsSync(resolve(dirname(file), m[1]))) err(`${rel}: referenced file not found: ${m[1]}`)
  }
}

// 3) Required content: positioning, prerequisites, login, three-step flow, four error classes.
const REQUIRED = [
  { file: 'README.md', label: '定位', test: (t) => /B\s?站 Toy|Toy 创作者平台/.test(t) },
  { file: 'README.md', label: '前置: toy 二进制', test: (t) => /`toy` CLI|toy` 二进制/.test(t) },
  { file: 'README.md', label: '前置: 登录', test: (t) => /toy login/.test(t) },
  { file: 'README.md', label: '三步流程', test: (t) => /预检[\s\S]{0,300}预览[\s\S]{0,300}提交审核/.test(t) },
  { file: 'README.md', label: '错误: 没登录', test: (t) => /登录态|没登录|未登录/.test(t) },
  { file: 'README.md', label: '错误: 装不上', test: (t) => /安装[\s\S]{0,80}(失败|卡|装不上)|装不上/.test(t) },
  { file: 'README.md', label: '错误: 预检 ERROR', test: (t) => /预检[\s\S]{0,80}ERROR|ERROR[\s\S]{0,80}预检/.test(t) },
  { file: 'README.md', label: '错误: 预览确认', test: (t) => /预览[\s\S]{0,80}确认|确认[\s\S]{0,80}预览/.test(t) },

  { file: 'README.en.md', label: 'positioning', test: (t) => /Bilibili Toy|Toy creator platform/i.test(t) },
  { file: 'README.en.md', label: 'prereq: toy binary', test: (t) => /`toy` CLI|toy` binary/i.test(t) },
  { file: 'README.en.md', label: 'prereq: login', test: (t) => /toy login/.test(t) },
  { file: 'README.en.md', label: 'three-step flow', test: (t) => /precheck[\s\S]{0,300}preview[\s\S]{0,300}submit/i.test(t) },
  { file: 'README.en.md', label: 'error: expired login', test: (t) => /expired login|session expires|not logged in/i.test(t) },
  { file: 'README.en.md', label: 'error: install', test: (t) => /install[\s\S]{0,80}(fail|skip|stuck)|missing/i.test(t) },
  { file: 'README.en.md', label: 'error: precheck ERROR', test: (t) => /precheck[\s\S]{0,80}ERROR|ERROR[\s\S]{0,80}precheck/i.test(t) },
  { file: 'README.en.md', label: 'error: preview confirmation', test: (t) => /preview[\s\S]{0,80}confirm|confirm[\s\S]{0,80}preview/i.test(t) },

  { file: 'skills/toy/SKILL.md', label: '定位', test: (t) => /Toy 创作者平台|toy.*官方命令行/.test(t) },
  { file: 'skills/toy/SKILL.md', label: '前置', test: (t) => /command -v toy[\s\S]{0,80}toy login/.test(t) },
  { file: 'skills/toy/SKILL.md', label: '登录', test: (t) => /toy login/.test(t) },
  { file: 'skills/toy/SKILL.md', label: '三步流程', test: (t) => /预检[\s\S]{0,200}预览[\s\S]{0,200}提交审核/.test(t) },
  { file: 'skills/toy/SKILL.md', label: '错误: 没登录', test: (t) => /没登录|登录态已失效|登录态\s*已?失效/.test(t) },
  { file: 'skills/toy/SKILL.md', label: '错误: 装不上', test: (t) => /没装|安装指引|command -v toy/.test(t) },
  { file: 'skills/toy/SKILL.md', label: '错误: 预检 ERROR', test: (t) => /预检报 ERROR|ERROR[\s\S]{0,60}预检/.test(t) },
  { file: 'skills/toy/SKILL.md', label: '错误: 预览确认', test: (t) => /预览[\s\S]{0,80}确认/.test(t) },
]

for (const check of REQUIRED) {
  const entry = md.find(({ rel }) => rel === check.file)
  if (!entry) { err(`required file missing: ${check.file}`); continue }
  if (!check.test(entry.text)) err(`${check.file}: missing required content — ${check.label}`)
}

// 4) Local doc references that must stay in sync.
const DOC_OWNERS = [
  ['dsh/README.md', true],
  ['dsh/README.en.md', true],
  ['dsh/packages/toy/README.md', true],
]
for (const [rel] of DOC_OWNERS) {
  if (!existsSync(join(ROOT, rel))) err(`missing doc: ${rel}`)
}

if (errors > 0) {
  console.error(`\n${errors} error(s), ${warnings} warning(s)`)
  process.exit(1)
}
console.log(`docs ok: ${md.length} markdown files checked, ${warnings} warning(s)`)
