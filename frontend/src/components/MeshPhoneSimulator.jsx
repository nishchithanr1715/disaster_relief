import React, { useState, useEffect, useRef } from 'react';
import {
  X, Wifi, WifiOff, Battery, Signal, ChevronUp, ChevronDown,
  Bell, Terminal, AlertTriangle, Radio
} from 'lucide-react';
import useSocket from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';

/* ─── helper: hash UUID → stable number ──────────────────────── */
const hashStr = (s = '') => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h);
};

const MeshPhoneSimulator = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const socket = useSocket();

  /* ── simulated hardware state ─────────────────────────── */
  const [simOffline, setSimOffline] = useState(
    () => localStorage.getItem('reliefsync_sim_offline') === 'true'
  );
  const [bleActive, setBleActive]   = useState(true);
  const [loraOn,   setLoraOn]       = useState(true);
  const [battery,  setBattery]      = useState(87);

  /* ── UI state ─────────────────────────────────────────── */
  const [showControls, setShowControls] = useState(false);   // slide-up RF drawer
  const [alertFlash,   setAlertFlash]   = useState(false);   // notification badge
  const [logs,         setLogs]         = useState([]);
  const [alerts,       setAlerts]       = useState([]);
  const [sachet,       setSachet]       = useState(null);    // full-screen SACHET overlay

  const logEnd = useRef(null);
  const iframeRef = useRef(null);

  /* ── derived identifiers ──────────────────────────────── */
  const hash = hashStr(user?.id);
  const simIp  = `192.168.43.${(hash % 253) + 2}`;
  const simMac = `00:1A:2B:3C:4D:${(hash % 99).toString().padStart(2, '0')}`;
  const time   = () => new Date().toLocaleTimeString();

  const addLog = (text, type = 'info') =>
    setLogs(p => [...p, { t: time(), text, type }].slice(-60));

  /* ── send test alert (for demo) ─────────────────────── */
  const sendTestAlert = () => {
    if (!socket || !user) return;
    const pkt = {
      senderName: user.name,
      message: '🚨 Test emergency alert',
      urgency: 'immediate'
    };
    socket.emit('mesh_send_sos', pkt);
    addLog('📡 Test alert dispatched', 'info');
  };

  /* ── toggle simulated offline ─────────────────────────── */
  const toggleOffline = () => {
    const next = !simOffline;
    setSimOffline(next);
    localStorage.setItem('reliefsync_sim_offline', next ? 'true' : 'false');
    window.dispatchEvent(new Event('storage'));
    if (next) {
      addLog('⚠ CELL BLACKOUT: cloud routing severed', 'warn');
      addLog('📡 BLE + LoRa beacon advertising started', 'info');
    } else {
      addLog('✅ CELL RESTORED: cloud sync active', 'success');
    }
  };

  /* ── auto-scroll logs ─────────────────────────────────── */
  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  /* ── socket listener ──────────────────────────────────── */
  useEffect(() => {
    if (!socket || !user) return;
    addLog(`📱 Boot: ${user.name}'s device`, 'info');
    addLog(`   IP ${simIp}  MAC ${simMac}`, 'info');
    addLog('   Channels: BLE · 868MHz LoRa · TCP', 'info');

    const onMesh = (pkt) => {
      if (pkt.senderName === user.name) return;
      addLog(`📡 [RX] "${pkt.senderName}" → "${pkt.message}"`, 'warn');
      setAlerts(p => [{
        id: Date.now(), sender: pkt.senderName,
        message: pkt.message, time: time()
      }, ...p]);
      setAlertFlash(true);
      if (pkt.urgency === 'immediate' || pkt.senderName === 'WEATHER SYSTEM (AUTO)') {
        setSachet({ sender: pkt.senderName, message: pkt.message, time: time() });
      }
    };
    socket.on('mesh_receive_sos', onMesh);
    return () => socket.off('mesh_receive_sos', onMesh);
  }, [socket, user]);

  /* ── battery drain sim ────────────────────────────────── */
  useEffect(() => {
    const t = setInterval(() =>
      setBattery(b => b > 10 ? b - 1 : 87), 30000);
    return () => clearInterval(t);
  }, []);

  if (!isOpen) return null;

  /* ────────────────── RENDER ───────────────────────────── */
  return (
    /* Backdrop dimmer */
    <div className="fixed inset-0 z-[999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} onClick={onClose}>

      {/* ══════ PHONE CHASSIS ══════ */}
      <div style={{
        width: 260,
        height: 540,
        background: 'linear-gradient(145deg, #1e293b, #0f172a)',
        borderRadius: 40,
        border: '5px solid #334155',
        boxShadow: '0 0 0 1px #0f172a, 0 20px 60px -10px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 1000,
        // Prevent click propagation to backdrop
        onClick: (e) => e.stopPropagation()
      }}>

        {/* ── physical side buttons ── */}
        {/* Power */}
        <div style={{
          position:'absolute', right:-4, top:100,
          width:3, height:44,
          background:'#334155', borderRadius:'0 4px 4px 0',
          boxShadow:'1px 0 3px rgba(0,0,0,0.4)'
        }}/>
        {/* Vol Up */}
        <div style={{
          position:'absolute', left:-4, top:90,
          width:3, height:32,
          background:'#334155', borderRadius:'4px 0 0 4px',
          boxShadow:'-1px 0 3px rgba(0,0,0,0.4)'
        }}/>
        {/* Vol Down */}
        <div style={{
          position:'absolute', left:-4, top:130,
          width:3, height:32,
          background:'#334155', borderRadius:'4px 0 0 4px',
          boxShadow:'-1px 0 3px rgba(0,0,0,0.4)'
        }}/>

        {/* ── Dynamic Island / Notch ── */}
        <div style={{
          position:'absolute', top:10, left:'50%', transform:'translateX(-50%)',
          width: showControls ? 120 : 90,
          height: showControls ? 28 : 22,
          background:'#000',
          borderRadius: 20,
          zIndex: 30,
          transition:'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 12px',
          boxShadow:'0 2px 8px rgba(0,0,0,0.6)',
        }}>
          {/* front camera */}
          <div style={{width:9, height:9, borderRadius:'50%', background:'#0f172a',
            border:'1.5px solid #1e293b', position:'relative'}}>
            <div style={{width:3, height:3, borderRadius:'50%', background:'#1d4ed8',
              position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)'}}/>
          </div>
          {/* speaker grille */}
          <div style={{flex:1, margin:'0 8px', height:3, background:'#1e293b', borderRadius:2}}/>
          {/* face sensor */}
          <div style={{width:6, height:6, borderRadius:'50%', background:'#0f172a',
            border:'1px solid #1e293b'}}/>
        </div>

        {/* ── SCREEN BEZEL (inner glass) ── */}
        <div style={{
          flex:1, margin: '5px 3px',
          borderRadius:36,
          background:'#020617',
          overflow:'hidden',
          position:'relative',
          display:'flex', flexDirection:'column',
          boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.04)',
        }}>

          {/* ── STATUS BAR ── */}
          <div style={{
            background:'rgba(2,6,23,0.92)',
            paddingTop:18, paddingBottom:4, paddingLeft:12, paddingRight:12,
            display:'flex', alignItems:'center', justifyContent:'space-between',
            fontSize:9, color:'#94a3b8', fontFamily:'monospace',
            flexShrink:0, zIndex:20,
            borderBottom:'1px solid rgba(255,255,255,0.04)',
          }}>
            <div style={{display:'flex', alignItems:'center', gap:4}}>
              {simOffline
                ? <WifiOff size={11} color="#f43f5e" />
                : <Wifi     size={11} color="#34d399" />}
              <span style={{color: simOffline ? '#f43f5e' : '#94a3b8', fontWeight: simOffline ? 700 : 400}}>
                {simOffline ? 'OFFLINE' : simIp}
              </span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:6}}>
              {alertFlash && (
                <span style={{
                  background:'#ef4444', color:'#fff', borderRadius:6,
                  padding:'1px 5px', fontSize:9, fontWeight:700,
                  animation:'pulse 1s infinite'
                }}>
                  {alerts.length} ALERT{alerts.length !== 1 ? 'S' : ''}
                </span>
              )}
              <Signal size={11} color="#94a3b8"/>
              <Battery size={13} color={battery < 20 ? '#ef4444' : '#34d399'}/>
              <span>{battery}%</span>
              {/* Test Alert Button */}
              <button onClick={sendTestAlert}
                style={{
                  marginLeft:4,
                  background:'#ef4444',
                  color:'#fff',
                  border:'none',
                  borderRadius:3,
                  padding:'2px 6px',
                  fontSize:8,
                  cursor:'pointer',
                  boxShadow:'0 1px 3px rgba(0,0,0,0.3)'
                }}
              >Alert</button>
            </div>
          </div>

          {/* ── MAIN CONTENT: iframe of the actual app — scaled down to fit ── */}
          <div style={{flex:1, position:'relative', overflow:'hidden'}}>
            <iframe
              ref={iframeRef}
              src="http://localhost:5173?noPhone=true"
              title="ReliefSync – Virtual Device"
              style={{
                width: '150%',
                height: '150%',
                border: 'none',
                display: 'block',
                transform: 'scale(0.667)',
                transformOrigin: 'top left',
                filter: simOffline ? 'saturate(0.4) brightness(0.75)' : 'none',
                transition: 'filter 0.4s ease',
              }}
              allow="geolocation"
            />

            {/* offline overlay hint */}
            {simOffline && (
              <div style={{
                position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)',
                background:'rgba(239,68,68,0.92)', color:'#fff',
                padding:'4px 10px', borderRadius:12,
                fontSize:9, fontWeight:800, letterSpacing:1,
                pointerEvents:'none', whiteSpace:'nowrap',
                boxShadow:'0 2px 8px rgba(0,0,0,0.4)',
              }}>
                ✈ AIRPLANE MODE — SIM BLACKOUT ACTIVE
              </div>
            )}
          </div>

          {/* ── RF CONTROLS SLIDE-UP DRAWER ── */}
          <div style={{
            position:'absolute', bottom:0, left:0, right:0,
            background:'linear-gradient(to top, #0f172a, #1e293b)',
            borderTop:'1px solid rgba(255,255,255,0.07)',
            borderRadius:'0 0 46px 46px',
            transform: showControls ? 'translateY(0)' : 'translateY(calc(100% - 36px))',
            transition:'transform 0.4s cubic-bezier(0.34,1.2,0.64,1)',
            zIndex:25,
            maxHeight:'70%',
            overflowY:'auto',
          }}>
            {/* drawer handle */}
            <button
              onClick={() => setShowControls(s => !s)}
              style={{
                width:'100%', padding:'8px 0', cursor:'pointer',
                background:'transparent', border:'none',
                display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              }}
            >
              <div style={{width:36, height:4, borderRadius:2, background:'#334155'}}/>
              <div style={{display:'flex', alignItems:'center', gap:5, color:'#64748b', fontSize:9, fontFamily:'monospace', fontWeight:700, letterSpacing:1}}>
                {showControls ? <ChevronDown size={11}/> : <ChevronUp size={11}/>}
                RF MESH CONTROLS
                {showControls ? <ChevronDown size={11}/> : <ChevronUp size={11}/>}
              </div>
            </button>

            {/* drawer body */}
            <div style={{padding:'0 16px 16px', display: showControls ? 'block' : 'none'}}>
              {/* Cell Tower */}
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                <div>
                  <p style={{color:'#e2e8f0', fontSize:11, fontWeight:700, margin:0}}>Cell Tower Link</p>
                  <p style={{color:'#64748b', fontSize:9, margin:0}}>Simulate network blackout</p>
                </div>
                <button onClick={toggleOffline} style={{
                  padding:'3px 10px', borderRadius:6,
                  background: simOffline ? '#ef4444' : '#10b981',
                  color:'#fff', border:'none', cursor:'pointer',
                  fontSize:9, fontWeight:800, letterSpacing:1, textTransform:'uppercase'
                }}>
                  {simOffline ? 'OFFLINE' : 'ONLINE'}
                </button>
              </div>
              {/* BLE */}
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, paddingTop:8, borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                <div>
                  <p style={{color:'#e2e8f0', fontSize:11, fontWeight:700, margin:0}}>BLE Discovery</p>
                  <p style={{color:'#64748b', fontSize:9, margin:0}}>Peer-to-peer beacon</p>
                </div>
                <button onClick={() => { setBleActive(b => !b); addLog(`BLE → ${!bleActive ? 'ACTIVE' : 'STANDBY'}`, 'info'); }} style={{
                  padding:'3px 10px', borderRadius:6,
                  background: bleActive ? '#6366f1' : '#334155',
                  color: bleActive ? '#fff' : '#64748b',
                  border:'none', cursor:'pointer',
                  fontSize:9, fontWeight:800, letterSpacing:1, textTransform:'uppercase'
                }}>
                  {bleActive ? 'ACTIVE' : 'STANDBY'}
                </button>
              </div>
              {/* LoRa */}
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:8, borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                <div>
                  <p style={{color:'#e2e8f0', fontSize:11, fontWeight:700, margin:0}}>868MHz LoRa</p>
                  <p style={{color:'#64748b', fontSize:9, margin:0}}>Sub-GHz long range</p>
                </div>
                <button onClick={() => { setLoraOn(l => !l); addLog(`LoRa → ${!loraOn ? 'ON' : 'OFF'}`, 'info'); }} style={{
                  padding:'3px 10px', borderRadius:6,
                  background: loraOn ? '#f59e0b' : '#334155',
                  color: loraOn ? '#000' : '#64748b',
                  border:'none', cursor:'pointer',
                  fontSize:9, fontWeight:800, letterSpacing:1, textTransform:'uppercase'
                }}>
                  {loraOn ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Terminal Log */}
              <div style={{
                marginTop:12, background:'#000', borderRadius:12,
                padding:10, height:120, overflow:'hidden', display:'flex', flexDirection:'column',
                border:'1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{color:'#4ade80', fontSize:9, fontFamily:'monospace', fontWeight:700, marginBottom:4, display:'flex', alignItems:'center', gap:4}}>
                  <Terminal size={9}/> FRAME LOG
                </div>
                <div style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:1}}>
                  {logs.map((l, i) => (
                    <div key={i} style={{display:'flex', gap:6, fontFamily:'monospace', fontSize:8}}>
                      <span style={{color:'#374151', flexShrink:0}}>[{l.t}]</span>
                      <span style={{color: l.type==='success'?'#34d399':l.type==='warn'?'#f87171':l.type==='info'?'#818cf8':'#94a3b8'}}>
                        {l.text}
                      </span>
                    </div>
                  ))}
                  <div ref={logEnd}/>
                </div>
              </div>

              {/* Alerts */}
              {alerts.length > 0 && (
                <div style={{marginTop:10}}>
                  <p style={{color:'#f43f5e', fontSize:9, fontWeight:800, letterSpacing:1, textTransform:'uppercase', margin:'0 0 6px'}}>
                    Decoded Mesh Alerts
                  </p>
                  <div style={{maxHeight:90, overflowY:'auto', display:'flex', flexDirection:'column', gap:5}}>
                    {alerts.map(a => (
                      <div key={a.id} style={{
                        background:'rgba(239,68,68,0.08)', borderRadius:8, padding:'5px 8px',
                        border:'1px solid rgba(239,68,68,0.2)', fontSize:9, color:'#fca5a5',
                      }}>
                        <strong style={{color:'#f87171'}}>{a.sender}</strong> <span style={{color:'#475569'}}>({a.time})</span>
                        <br/>{a.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── SACHET full-screen override ── */}
          {sachet && (
            <div style={{
              position:'absolute', inset:0, zIndex:40,
              background:'rgba(127,0,0,0.96)',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              padding:20, textAlign:'center', borderRadius:'inherit',
              animation:'pulse 1s infinite',
            }}>
              <AlertTriangle size={52} color="#ef4444" style={{marginBottom:12}}/>
              <p style={{color:'#fff', fontSize:14, fontWeight:900, letterSpacing:2, marginBottom:4}}>⚠️ CELL BROADCAST</p>
              <p style={{color:'#fca5a5', fontSize:8, fontWeight:700, letterSpacing:2, marginBottom:12}}>NDMA / SACHET ALERT SYSTEM</p>
              <div style={{
                background:'rgba(0,0,0,0.4)', borderRadius:12, padding:12,
                color:'#fee2e2', fontSize:11, lineHeight:1.5, marginBottom:16,
                border:'1px solid rgba(239,68,68,0.3)', maxWidth:240,
              }}>
                <p style={{color:'#f87171', fontSize:8, marginBottom:4, fontFamily:'monospace'}}>{sachet.time}</p>
                {sachet.message}
              </div>
              <button onClick={() => { setSachet(null); setAlertFlash(false); }} style={{
                background:'#ef4444', color:'#fff', border:'none', cursor:'pointer',
                borderRadius:8, padding:'6px 20px', fontSize:10, fontWeight:800,
                letterSpacing:1, textTransform:'uppercase',
              }}>
                ACKNOWLEDGE
              </button>
            </div>
          )}

          {/* ── Home Bar ── */}
          <div style={{
            background:'rgba(2,6,23,0.9)', paddingBottom:7, paddingTop:4,
            display:'flex', justifyContent:'center', flexShrink:0,
            borderTop:'1px solid rgba(255,255,255,0.04)',
            borderRadius: '0 0 36px 36px',
          }}>
            <div style={{width:55, height:3, background:'#1e293b', borderRadius:2}}/>
          </div>
        </div>

        {/* Close button floating outside top-right of bezel */}
        <button onClick={onClose} style={{
          position:'absolute', top:-14, right:-14,
          width:32, height:32, borderRadius:'50%',
          background:'#ef4444', border:'2px solid #fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.4)',
          zIndex: 1010,
          transition:'transform 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.transform='scale(1.15)'}
          onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
        >
          <X size={16} color="#fff"/>
        </button>

      </div>
    </div>
  );
};

export default MeshPhoneSimulator;
