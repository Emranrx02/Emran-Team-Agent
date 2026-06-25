'use client'
import { useState, useEffect, useRef } from 'react'
import styles from './AgentForge.module.css'

function useLocalStorage(key, init) {
  const [val, setVal] = useState(init)
  useEffect(() => {
    try { const s = localStorage.getItem(key); if (s) setVal(JSON.parse(s)) } catch {}
  }, [key])
  const save = (v) => { setVal(v); localStorage.setItem(key, JSON.stringify(v)) }
  return [val, save]
}

async function callOpenAI(apiKey, system, messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1024,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.choices?.[0]?.message?.content || '(no response)'
}

function buildSystem(p, files) {
  let s = `You are an AI assistant trained specifically for this project.\n\nPROJECT: ${p.name}\n`
  if (p.intro) s += `\nDESCRIPTION:\n${p.intro}\n`
  if (p.tone) s += `\nTONE: ${p.tone}\n`
  if (files?.length) {
    s += `\nKNOWLEDGE BASE:\n`
    files.forEach(f => { s += `\n--- ${f.name} ---\n${f.text.substring(0, 7000)}\n` })
  }
  s += `\nRULES:\n- Answer based on the info above.\n- Write like a real human — warm and natural.\n- Never say you are ChatGPT or an AI.\n- If unsure, say so honestly.`
  return s
}

function ApiKeyModal({ onSave }) {
  const [key, setKey] = useState('')
  const handle = () => {
    if (!key.startsWith('sk-')) { alert('Key must start with sk-'); return }
    onSave(key)
  }
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>🔑 OpenAI API Key</h2>
        <p>Enter your OpenAI API key. Saved only in your browser.</p>
        <input className={styles.field} type="password" placeholder="sk-proj-…" value={key}
          onChange={e => setKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />
        <div className={styles.hintBox}>
          👉 Key পেতে: <strong>platform.openai.com</strong> → API Keys → Create new secret key
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnCreate} onClick={handle}>Save &amp; Continue</button>
        </div>
      </div>
    </div>
  )
}

function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const handle = () => { if (!name.trim()) return; onCreate(name.trim()); onClose() }
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Create New Project</h2>
        <p>Give your AI agent a name.</p>
        <input className={styles.field} type="text" placeholder="e.g. Customer Support Bot…"
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handle()} maxLength={60} autoFocus />
        <div className={styles.modalActions}>
          <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
          <button className={styles.btnCreate} onClick={handle}>Create</button>
        </div>
      </div>
    </div>
  )
}

function Sidebar({ projects, currentId, onSelect, onNew, onDelete, onChangeKey }) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🤖</div>
          <div>
            <div className={styles.logoText}>Agent<span>Emran</span></div>
            <div className={styles.powered}>Powered by EMran Team</div>
          </div>
        </div>
        <button className={styles.btnNew} onClick={onNew}>+ New Project</button>
      </div>
      <div className={styles.projectList}>
        {!projects.length && <div className={styles.noProjects}>No projects yet</div>}
        {projects.map(p => (
          <div key={p.id} className={`${styles.projItem} ${p.id === currentId ? styles.active : ''}`}
            onClick={() => onSelect(p.id)}>
            <div className={`${styles.dot} ${p.trained ? '' : styles.dotUntrained}`} />
            <div className={styles.projName}>{p.name}</div>
            <span className={styles.projDel} onClick={e => { e.stopPropagation(); onDelete(p.id) }}>×</span>
          </div>
        ))}
      </div>
      <div className={styles.sidebarFooter}>
        OpenAI API &nbsp;·&nbsp;
        <span className={styles.link} onClick={onChangeKey}>Change API Key</span>
      </div>
    </div>
  )
}

function SetupPanel({ project, files, onSave, onFileAdd, onFileRemove }) {
  const [intro, setIntro] = useState(project.intro || '')
  const [tone, setTone] = useState(project.tone || '')
  const [status, setStatus] = useState(null)
  const fileInputRef = useRef()

  useEffect(() => { setIntro(project.intro || ''); setTone(project.tone || ''); setStatus(null) }, [project.id])

  const handleFiles = async (fileList) => {
    for (const file of fileList) {
      const text = await new Promise(res => {
        const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsText(file)
      })
      onFileAdd({ name: file.name, size: file.size, text })
    }
  }

  const train = async () => {
    setStatus('loading')
    try {
      const sys = buildSystem({ ...project, intro, tone }, files)
      const apiKey = localStorage.getItem('af_oai_key') || ''
      const reply = await callOpenAI(apiKey, sys, [{ role: 'user', content: 'Confirm you are ready. Reply in one short sentence in the project tone.' }])
      onSave({ intro, tone, systemPrompt: sys, trained: true })
      setStatus({ ok: true, msg: reply })
    } catch (e) {
      setStatus({ ok: false, msg: e.message })
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <div className={styles.label}>Project Introduction</div>
        <textarea className={styles.field} rows={4}
          placeholder="Describe this project — what it's about, what the AI should know…"
          value={intro} onChange={e => setIntro(e.target.value)} />
      </div>
      <div className={styles.section}>
        <div className={styles.label}>Upload Knowledge Files</div>
        <div className={styles.uploadZone} onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}>
          <div className={styles.uploadIcon}>📄</div>
          <div className={styles.uploadText}>Click or drag files here</div>
          <div className={styles.uploadSub}>TXT, PDF, DOCX, MD, CSV supported</div>
        </div>
        <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.docx,.md,.doc,.csv"
          style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
        <div className={styles.fileList}>
          {files.map((f, i) => (
            <div key={i} className={styles.fileItem}>
              <span>{f.name.endsWith('.pdf') ? '📕' : f.name.endsWith('.docx') ? '📘' : '📄'}</span>
              <span className={styles.fileName}>{f.name}</span>
              <span className={styles.fileSize}>{(f.size / 1024).toFixed(1)}KB</span>
              <span className={styles.fileRemove} onClick={() => onFileRemove(i)}>×</span>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.section}>
        <div className={styles.label}>AI Tone / Personality</div>
        <input className={styles.field} type="text"
          placeholder="e.g. Friendly and professional, like a helpful teammate"
          value={tone} onChange={e => setTone(e.target.value)} />
      </div>
      <button className={styles.btnTrain} onClick={train} disabled={status === 'loading'}>
        {status === 'loading' ? '⏳ Training…' : '🚀 Train Agent'}
      </button>
      {status && status !== 'loading' && (
        <div className={`${styles.trainStatus} ${status.ok ? styles.statusOk : styles.statusErr}`}>
          {status.ok ? `✅ Trained! Agent says: ${status.msg}` : `❌ Error: ${status.msg}`}
        </div>
      )}
    </div>
  )
}

function ChatPanel({ project }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()
  const textareaRef = useRef()

  useEffect(() => { setMessages([]) }, [project.id])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const send = async () => {
    if (!input.trim() || loading) return
    if (!project.trained) { alert('Please train this agent first!'); return }
    const userMsg = { role: 'user', content: input.trim() }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    try {
      const apiKey = localStorage.getItem('af_oai_key') || ''
      const reply = await callOpenAI(apiKey, project.systemPrompt, newMsgs.map(m => ({ role: m.role, content: m.content })))
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error: ' + e.message }])
    }
    setLoading(false)
  }

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
  const handleInput = e => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px'
  }

  return (
    <div className={styles.chatPanel}>
      <div className={styles.chatMessages}>
        {!messages.length && (
          <div className={styles.chatEmpty}>
            <div className={styles.chatEmptyIcon}>💬</div>
            <p>Ask your AI agent anything!</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.msgUser : styles.msgAi}`}>
            <div className={styles.msgAvatar}>{m.role === 'user' ? '👤' : '🤖'}</div>
            <div className={styles.msgBubble}
              dangerouslySetInnerHTML={{ __html: m.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>') }} />
          </div>
        ))}
        {loading && (
          <div className={`${styles.msg} ${styles.msgAi}`}>
            <div className={styles.msgAvatar}>🤖</div>
            <div className={styles.msgBubble}>
              <div className={styles.typingDots}><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className={styles.chatInputArea}>
        <textarea ref={textareaRef} className={styles.chatInput} rows={1}
          placeholder="Ask your AI agent anything…" value={input}
          onChange={handleInput} onKeyDown={handleKey} />
        <button className={styles.btnSend} onClick={send} disabled={loading}>➤</button>
      </div>
    </div>
  )
}

export default function AgentForge() {
  const [apiKey, setApiKey] = useLocalStorage('af_oai_key', '')
  const [projects, setProjects] = useLocalStorage('af_oai_projects', [])
  const [currentId, setCurrentId] = useState(null)
  const [tab, setTab] = useState('setup')
  const [showNewModal, setShowNewModal] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!localStorage.getItem('af_oai_key')) setShowKeyModal(true)
  }, [])

  if (!mounted) return null

  const current = projects.find(p => p.id === currentId)

  const createProject = (name) => {
    const id = 'p' + Date.now()
    const updated = [...projects, { id, name, intro: '', tone: '', trained: false, systemPrompt: '' }]
    setProjects(updated)
    setUploadedFiles(prev => ({ ...prev, [id]: [] }))
    setCurrentId(id)
    setTab('setup')
  }

  const deleteProject = (id) => {
    if (!confirm('Delete this project?')) return
    setProjects(projects.filter(p => p.id !== id))
    if (currentId === id) setCurrentId(null)
  }

  const saveProjectData = (data) => {
    setProjects(projects.map(p => p.id === currentId ? { ...p, ...data } : p))
  }

  return (
    <>
      {(!apiKey || showKeyModal) && (
        <ApiKeyModal onSave={k => { localStorage.setItem('af_oai_key', k); setApiKey(k); setShowKeyModal(false) }} />
      )}
      {showNewModal && <NewProjectModal onClose={() => setShowNewModal(false)} onCreate={createProject} />}

      <div className={styles.app}>
        <Sidebar projects={projects} currentId={currentId}
          onSelect={id => { setCurrentId(id); setTab('setup') }}
          onNew={() => setShowNewModal(true)}
          onDelete={deleteProject}
          onChangeKey={() => setShowKeyModal(true)} />

        <div className={styles.main}>
          {!current ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🧠</div>
              <div className={styles.emptyTitle}>No project selected</div>
              <div className={styles.emptySub}>Create a project, train it with your data, then start chatting.</div>
            </div>
          ) : (
            <div className={styles.projectView}>
              <div className={styles.topbar}>
                <div className={styles.topbarName}>{current.name}</div>
                <span className={`${styles.badge} ${current.trained ? styles.badgeTrained : styles.badgeUntrained}`}>
                  {current.trained ? '✅ Trained' : 'Not Trained'}
                </span>
              </div>
              <div className={styles.tabs}>
                <div className={`${styles.tab} ${tab==='setup' ? styles.tabActive : ''}`} onClick={() => setTab('setup')}>⚙️ Setup &amp; Train</div>
                <div className={`${styles.tab} ${tab==='chat' ? styles.tabActive : ''}`} onClick={() => setTab('chat')}>💬 Chat</div>
              </div>
              {tab === 'setup' && (
                <SetupPanel project={current}
                  files={uploadedFiles[current.id] || []}
                  onSave={saveProjectData}
                  onFileAdd={f => setUploadedFiles(prev => ({ ...prev, [currentId]: [...(prev[currentId]||[]), f] }))}
                  onFileRemove={i => setUploadedFiles(prev => {
                    const arr = [...(prev[currentId]||[])]; arr.splice(i,1); return { ...prev, [currentId]: arr }
                  })} />
              )}
              {tab === 'chat' && <ChatPanel project={current} />}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
