import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Home() {
  // Estado general del partido
  const [matchStarted, setMatchStarted] = useState(false);
  const [matchEnded, setMatchEnded] = useState(false);

  // Equipos con soporte para 'inCourt' (en cancha)
  const [teamA, setTeamA] = useState({
    name: "Equipo Local",
    timeouts: 0,
    players: [],
  });
  const [teamB, setTeamB] = useState({
    name: "Equipo Visitante",
    timeouts: 0,
    players: [],
  });

  // Formulario temporal
  const [newPlayerA, setNewPlayerA] = useState({ name: "", number: "" });
  const [newPlayerB, setNewPlayerB] = useState({ name: "", number: "" });

  // Cronómetros
  const [quarter, setQuarter] = useState(1);
  const [timeLeft, setTimeLeft] = useState(600); // 10 min
  const [shotClock, setShotClock] = useState(24); // 24 seg
  const [isRunning, setIsRunning] = useState(false);

  // Puntuación y faltas colectivas por cuarto
  const [quarterScores, setQuarterScores] = useState({
    1: { A: 0, B: 0 },
    2: { A: 0, B: 0 },
    3: { A: 0, B: 0 },
    4: { A: 0, B: 0 },
  });

  const [teamFouls, setTeamFouls] = useState({
    1: { A: 0, B: 0 },
    2: { A: 0, B: 0 },
    3: { A: 0, B: 0 },
    4: { A: 0, B: 0 },
  });

  // Historial (Deshacer)
  const [history, setHistory] = useState([]);

  // Cargar localStorage
  useEffect(() => {
    const savedData = localStorage.getItem("basketball_match_v3");
    if (savedData) {
      try {
        const p = JSON.parse(savedData);
        setTeamA(p.teamA || { name: "Equipo Local", timeouts: 0, players: [] });
        setTeamB(p.teamB || { name: "Equipo Visitante", timeouts: 0, players: [] });
        setQuarter(p.quarter || 1);
        setMatchStarted(p.matchStarted || false);
        setMatchEnded(p.matchEnded || false);
        setQuarterScores(p.quarterScores || { 1: { A: 0, B: 0 }, 2: { A: 0, B: 0 }, 3: { A: 0, B: 0 }, 4: { A: 0, B: 0 } });
        setTeamFouls(p.teamFouls || { 1: { A: 0, B: 0 }, 2: { A: 0, B: 0 }, 3: { A: 0, B: 0 }, 4: { A: 0, B: 0 } });
      } catch (e) {
        console.error("Error al cargar localStorage", e);
      }
    }
  }, []);

  // Guardar localStorage
  useEffect(() => {
    if (matchStarted) {
      localStorage.setItem(
        "basketball_match_v3",
        JSON.stringify({
          teamA,
          teamB,
          quarter,
          matchStarted,
          matchEnded,
          quarterScores,
          teamFouls,
        })
      );
    }
  }, [teamA, teamB, quarter, matchStarted, matchEnded, quarterScores, teamFouls]);

  // Manejo de tiempos
  useEffect(() => {
    let timer = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        setShotClock((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Agregar Jugador (Por defecto los primeros 5 quedan en cancha)
  const addPlayer = (team, player, setPlayer, setTeam) => {
    if (!player.name || !player.number) return;
    const isStarter = team.players.length < 5; // Primeros 5 son titulares en cancha
    const newEntry = {
      id: Date.now(),
      name: player.name,
      number: player.number,
      points: 0,
      fouls: 0,
      inCourt: isStarter,
    };
    setTeam({ ...team, players: [...team.players, newEntry] });
    setPlayer({ name: "", number: "" });
  };

  // Alternar estado En Cancha / Banco
  const toggleCourtStatus = (teamType, playerId) => {
    const updater = (prevTeam) => {
      const activeCount = prevTeam.players.filter((p) => p.inCourt).length;
      const targetPlayer = prevTeam.players.find((p) => p.id === playerId);

      // Si queremos meterlo a cancha pero ya hay 5, avisamos
      if (!targetPlayer.inCourt && activeCount >= 5) {
        alert("Ya hay 5 jugadores en cancha. Saca a uno antes de ingresar otro.");
        return prevTeam;
      }

      return {
        ...prevTeam,
        players: prevTeam.players.map((p) =>
          p.id === playerId ? { ...p, inCourt: !p.inCourt } : p
        ),
      };
    };

    if (teamType === "A") setTeamA(updater);
    if (teamType === "B") setTeamB(updater);
  };

  // Guardar historial para Deshacer
  const saveHistory = () => {
    setHistory((prev) => [
      ...prev,
      JSON.stringify({ teamA, teamB, quarterScores, teamFouls }),
    ]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = JSON.parse(history[history.length - 1]);
    setTeamA(lastState.teamA);
    setTeamB(lastState.teamB);
    setQuarterScores(lastState.quarterScores);
    setTeamFouls(lastState.teamFouls);
    setHistory((prev) => prev.slice(0, prev.length - 1));
  };

  // Acciones de Partido
  const addPoints = (teamType, playerId, pts) => {
    saveHistory();
    const updater = (prevTeam) => ({
      ...prevTeam,
      players: prevTeam.players.map((p) =>
        p.id === playerId ? { ...p, points: p.points + pts } : p
      ),
    });

    if (teamType === "A") setTeamA(updater);
    if (teamType === "B") setTeamB(updater);

    setQuarterScores((prev) => ({
      ...prev,
      [quarter]: {
        ...prev[quarter],
        [teamType]: prev[quarter][teamType] + pts,
      },
    }));
  };

  const addFoul = (teamType, playerId) => {
    saveHistory();
    const updater = (prevTeam) => ({
      ...prevTeam,
      players: prevTeam.players.map((p) => {
        if (p.id === playerId) {
          const newFouls = Math.min(5, p.fouls + 1);
          // Si llega a 5 faltas, sale de cancha automáticamente
          return { ...p, fouls: newFouls, inCourt: newFouls >= 5 ? false : p.inCourt };
        }
        return p;
      }),
    });

    if (teamType === "A") setTeamA(updater);
    if (teamType === "B") setTeamB(updater);

    setTeamFouls((prev) => ({
      ...prev,
      [quarter]: {
        ...prev[quarter],
        [teamType]: prev[quarter][teamType] + 1,
      },
    }));
  };

  const addTimeout = (teamType) => {
    if (teamType === "A" && teamA.timeouts < 3) {
      saveHistory();
      setTeamA({ ...teamA, timeouts: teamA.timeouts + 1 });
    }
    if (teamType === "B" && teamB.timeouts < 3) {
      saveHistory();
      setTeamB({ ...teamB, timeouts: teamB.timeouts + 1 });
    }
  };

  const getTeamTotalPoints = (team) =>
    team.players.reduce((acc, curr) => acc + curr.points, 0);

  const handleNextQuarter = () => {
    if (quarter < 4) {
      setIsRunning(false);
      setTimeLeft(600);
      setShotClock(24);
      setQuarter((q) => q + 1);
    } else {
      setIsRunning(false);
      setTimeLeft(0);
      setMatchEnded(true);
    }
  };

  const resetMatch = () => {
    if (window.confirm("¿Deseas iniciar un nuevo partido? Se borrarán los datos actuales.")) {
      localStorage.removeItem("basketball_match_v3");
      setMatchStarted(false);
      setMatchEnded(false);
      setTeamA({ name: "Equipo Local", timeouts: 0, players: [] });
      setTeamB({ name: "Equipo Visitante", timeouts: 0, players: [] });
      setQuarter(1);
      setTimeLeft(600);
      setShotClock(24);
      setIsRunning(false);
      setQuarterScores({ 1: { A: 0, B: 0 }, 2: { A: 0, B: 0 }, 3: { A: 0, B: 0 }, 4: { A: 0, B: 0 } });
      setTeamFouls({ 1: { A: 0, B: 0 }, 2: { A: 0, B: 0 }, 3: { A: 0, B: 0 }, 4: { A: 0, B: 0 } });
      setHistory([]);
    }
  };

  // Exportar PDF
  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Planilla Oficial de Partido - FIBA", 14, 18);

    doc.setFontSize(11);
    doc.text(
      `Resultado Final: ${teamA.name} ${getTeamTotalPoints(teamA)} - ${getTeamTotalPoints(
        teamB
      )} ${teamB.name}`,
      14,
      27
    );
    doc.text(`Cuartos Jugados: ${quarter}`, 14, 34);

    autoTable(doc, {
      startY: 40,
      head: [["Equipo", "Q1", "Q2", "Q3", "Q4", "Total"]],
      body: [
        [
          teamA.name,
          quarterScores[1].A,
          quarterScores[2].A,
          quarterScores[3].A,
          quarterScores[4].A,
          getTeamTotalPoints(teamA),
        ],
        [
          teamB.name,
          quarterScores[1].B,
          quarterScores[2].B,
          quarterScores[3].B,
          quarterScores[4].B,
          getTeamTotalPoints(teamB),
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [44, 62, 80] },
    });

    let currentY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(13);
    doc.text(`Equipo: ${teamA.name} (Tiempos Muertos: ${teamA.timeouts}/3)`, 14, currentY);

    const dataA = teamA.players.map((p) => [
      `#${p.number}`,
      p.name,
      p.points,
      p.fouls,
      p.fouls >= 5 ? "EXPULSADO" : p.inCourt ? "EN CANCHA" : "BANQUILLO",
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [["N°", "Jugador", "Puntos", "Faltas", "Estado"]],
      body: dataA,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
    });

    currentY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(13);
    doc.text(`Equipo: ${teamB.name} (Tiempos Muertos: ${teamB.timeouts}/3)`, 14, currentY);

    const dataB = teamB.players.map((p) => [
      `#${p.number}`,
      p.name,
      p.points,
      p.fouls,
      p.fouls >= 5 ? "EXPULSADO" : p.inCourt ? "EN CANCHA" : "BANQUILLO",
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [["N°", "Jugador", "Puntos", "Faltas", "Estado"]],
      body: dataB,
      theme: "grid",
      headStyles: { fillColor: [192, 57, 43] },
    });

    doc.save(`planilla_fiba_${teamA.name}_vs_${teamB.name}.pdf`);
  };

  // Renderizador de lista de jugadores divididos por Cancha y Banquillo
  const renderTeamPlayers = (team, teamType, borderColor) => {
    const inCourtPlayers = team.players.filter((p) => p.inCourt);
    const benchPlayers = team.players.filter((p) => !p.inCourt);

    return (
      <div className={`bg-slate-900 border ${borderColor} p-4 rounded-xl space-y-4`}>
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <h3 className="font-bold text-sm text-slate-200 uppercase">{team.name}</h3>
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-amber-400 font-bold">
            En Cancha: {inCourtPlayers.length}/5
          </span>
        </div>

        {/* JUGADORES EN CANCHA */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            🟢 En Cancha (Titulares Activos)
          </h4>
          {inCourtPlayers.length === 0 && (
            <p className="text-xs text-slate-500 italic">No hay jugadores en cancha.</p>
          )}
          {inCourtPlayers.map((p) => (
            <div
              key={p.id}
              className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-2"
            >
              <div className="flex justify-between items-center font-bold text-sm">
                <span className="text-white">
                  #{p.number} {p.name}
                </span>
                <div className="flex gap-1.5 items-center">
                  <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    {p.points} pts | {p.fouls} F
                  </span>
                  <button
                    onClick={() => toggleCourtStatus(teamType, p.id)}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-bold"
                    title="Mandar al banco"
                  >
                    ⬇ Banco
                  </button>
                </div>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => addPoints(teamType, p.id, 1)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-1 rounded text-xs"
                >
                  +1
                </button>
                <button
                  onClick={() => addPoints(teamType, p.id, 2)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-1 rounded text-xs"
                >
                  +2
                </button>
                <button
                  onClick={() => addPoints(teamType, p.id, 3)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-1 rounded text-xs"
                >
                  +3
                </button>
                <button
                  onClick={() => addFoul(teamType, p.id)}
                  className="flex-1 bg-amber-600/80 hover:bg-amber-600 text-white font-bold py-1 rounded text-xs"
                >
                  Falta
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* JUGADORES EN EL BANQUILLO */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            🛋️ Suplentes (Banquillo)
          </h4>
          {benchPlayers.length === 0 && (
            <p className="text-xs text-slate-500 italic">No hay suplentes en el banco.</p>
          )}
          {benchPlayers.map((p) => {
            const isFouledOut = p.fouls >= 5;
            return (
              <div
                key={p.id}
                className="p-2 rounded bg-slate-950/50 border border-slate-800/60 flex justify-between items-center text-xs opacity-80"
              >
                <span className="text-slate-300 font-semibold">
                  #{p.number} {p.name} ({p.points} pts | {p.fouls}F)
                </span>
                {isFouledOut ? (
                  <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded">
                    EXPULSADO (5F)
                  </span>
                ) : (
                  <button
                    onClick={() => toggleCourtStatus(teamType, p.id)}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-2 py-0.5 rounded"
                  >
                    ⬆ Ingresar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 font-sans">
      <header className="max-w-6xl mx-auto bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-xl flex justify-between items-center mb-6">
        <h1 className="text-xl sm:text-2xl font-black text-amber-500 uppercase tracking-wider">
          🏀 Mesa de Control FIBA
        </h1>
        {matchStarted && (
          <div className="flex gap-2">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`px-3 py-1.5 rounded text-xs font-bold transition ${
                history.length > 0
                  ? "bg-amber-600 hover:bg-amber-500 text-white"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              }`}
            >
              ↩ Deshacer
            </button>
            <button
              onClick={resetMatch}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold transition"
            >
              Nuevo Partido
            </button>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto">
        {!matchStarted ? (
          /* CONFIGURACIÓN INICIAL DE PARTIDO Y PLANTELES */
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl">
            <h2 className="text-xl font-bold mb-6 text-slate-200 border-b border-slate-800 pb-3">
              Configuración Inicial de Equipos
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Carga Equipo A */}
              <div className="bg-slate-950/60 p-4 rounded-lg border border-blue-900/50">
                <label className="block text-sm font-bold mb-2 text-blue-400">
                  Equipo Local (A)
                </label>
                <input
                  type="text"
                  value={teamA.name}
                  onChange={(e) => setTeamA({ ...teamA, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded text-white mb-4 focus:outline-none focus:border-blue-500"
                />

                <h4 className="font-semibold text-xs text-slate-400 mb-2">Añadir Jugador</h4>
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    placeholder="N°"
                    value={newPlayerA.number}
                    onChange={(e) => setNewPlayerA({ ...newPlayerA, number: e.target.value })}
                    className="w-20 bg-slate-900 border border-slate-700 p-2 rounded text-white"
                  />
                  <input
                    type="text"
                    placeholder="Nombre Completo"
                    value={newPlayerA.name}
                    onChange={(e) => setNewPlayerA({ ...newPlayerA, name: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-700 p-2 rounded text-white"
                  />
                  <button
                    onClick={() => addPlayer(teamA, newPlayerA, setNewPlayerA, setTeamA)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 rounded"
                  >
                    +
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {teamA.players.map((p, idx) => (
                    <div
                      key={p.id}
                      className="text-xs bg-slate-900 p-2 rounded flex justify-between text-slate-300"
                    >
                      <span>
                        #{p.number} - {p.name}
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold">
                        {idx < 5 ? "Titular (En Cancha)" : "Suplente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Carga Equipo B */}
              <div className="bg-slate-950/60 p-4 rounded-lg border border-red-900/50">
                <label className="block text-sm font-bold mb-2 text-red-400">
                  Equipo Visitante (B)
                </label>
                <input
                  type="text"
                  value={teamB.name}
                  onChange={(e) => setTeamB({ ...teamB, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded text-white mb-4 focus:outline-none focus:border-red-500"
                />

                <h4 className="font-semibold text-xs text-slate-400 mb-2">Añadir Jugador</h4>
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    placeholder="N°"
                    value={newPlayerB.number}
                    onChange={(e) => setNewPlayerB({ ...newPlayerB, number: e.target.value })}
                    className="w-20 bg-slate-900 border border-slate-700 p-2 rounded text-white"
                  />
                  <input
                    type="text"
                    placeholder="Nombre Completo"
                    value={newPlayerB.name}
                    onChange={(e) => setNewPlayerB({ ...newPlayerB, name: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-700 p-2 rounded text-white"
                  />
                  <button
                    onClick={() => addPlayer(teamB, newPlayerB, setNewPlayerB, setTeamB)}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 rounded"
                  >
                    +
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {teamB.players.map((p, idx) => (
                    <div
                      key={p.id}
                      className="text-xs bg-slate-900 p-2 rounded flex justify-between text-slate-300"
                    >
                      <span>
                        #{p.number} - {p.name}
                      </span>
                      <span className="text-[10px] text-amber-400 font-bold">
                        {idx < 5 ? "Titular (En Cancha)" : "Suplente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setMatchStarted(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl text-lg shadow-lg transition uppercase tracking-wider"
            >
              Iniciar Partido
            </button>
          </div>
        ) : matchEnded ? (
          /* FINAL DEL PARTIDO */
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center space-y-6">
            <h2 className="text-3xl font-black text-amber-500 uppercase tracking-widest">
              ¡Partido Finalizado!
            </h2>

            <div className="bg-slate-950 p-6 rounded-xl max-w-xl mx-auto border border-slate-800 flex justify-around items-center">
              <div>
                <p className="text-xl font-bold text-blue-400">{teamA.name}</p>
                <p className="text-6xl font-black font-mono my-2 text-white">
                  {getTeamTotalPoints(teamA)}
                </p>
              </div>
              <div className="text-3xl font-black text-slate-600">VS</div>
              <div>
                <p className="text-xl font-bold text-red-400">{teamB.name}</p>
                <p className="text-6xl font-black font-mono my-2 text-white">
                  {getTeamTotalPoints(teamB)}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto pt-4">
              <button
                onClick={exportPDF}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-lg font-bold transition shadow-lg"
              >
                Exportar Planilla PDF
              </button>
              <button
                onClick={resetMatch}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-lg font-bold transition shadow-lg"
              >
                Nuevo Partido
              </button>
            </div>
          </div>
        ) : (
          /* MESA DE CONTROL ACTIVA CON CAMBIOS */
          <div className="space-y-6">
            {/* TABLERO LED PRINCIPAL */}
            <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-2xl shadow-2xl grid grid-cols-1 md:grid-cols-3 gap-6 text-center items-center">
              {/* Equipo A */}
              <div className="space-y-2">
                <h2 className="text-xl font-black text-blue-400 uppercase tracking-wider">
                  {teamA.name}
                </h2>
                <div className="text-7xl font-mono font-black text-white bg-slate-950 py-3 rounded-xl border border-slate-800 shadow-inner">
                  {getTeamTotalPoints(teamA)}
                </div>
                <div className="flex justify-between items-center px-2 text-xs font-semibold">
                  <span className="text-slate-400">
                    TM: <strong className="text-white">{teamA.timeouts}/3</strong>
                  </span>
                  <button
                    onClick={() => addTimeout("A")}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded border border-slate-700"
                  >
                    + TM
                  </button>
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      teamFouls[quarter].A >= 4
                        ? "bg-red-600 text-white animate-pulse"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    Faltas Q{quarter}: {teamFouls[quarter].A}{" "}
                    {teamFouls[quarter].A >= 4 && "(BONUS)"}
                  </span>
                </div>
              </div>

              {/* Relojes y Cuartos */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <p className="text-xs font-black text-amber-500 uppercase tracking-widest">
                  Cuarto {quarter} / 4
                </p>

                <div className="text-5xl font-mono font-black text-emerald-400 tracking-widest">
                  {formatTime(timeLeft)}
                </div>

                <div className="inline-block bg-slate-900 border border-slate-800 px-4 py-1 rounded-lg">
                  <span className="text-xs text-slate-500 mr-2 uppercase font-bold">
                    Posesión:
                  </span>
                  <span
                    className={`text-2xl font-mono font-black ${
                      shotClock <= 5 ? "text-red-500" : "text-amber-400"
                    }`}
                  >
                    {shotClock}s
                  </span>
                </div>

                <div className="flex justify-center gap-1.5 pt-2 flex-wrap">
                  <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={`px-4 py-2 rounded font-bold text-xs uppercase transition ${
                      isRunning
                        ? "bg-amber-600 hover:bg-amber-500 text-white"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {isRunning ? "Pausar" : "Iniciar"}
                  </button>
                  <button
                    onClick={() => setShotClock(24)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-2 rounded text-xs font-bold"
                  >
                    24s
                  </button>
                  <button
                    onClick={() => setShotClock(14)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-2 rounded text-xs font-bold"
                  >
                    14s
                  </button>
                  <button
                    onClick={handleNextQuarter}
                    className={`px-3 py-2 rounded text-xs font-bold transition ${
                      quarter === 4
                        ? "bg-purple-600 hover:bg-purple-500 text-white"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                    }`}
                  >
                    {quarter === 4 ? "Fin Partido" : "Sig. Q"}
                  </button>
                </div>
              </div>

              {/* Equipo B */}
              <div className="space-y-2">
                <h2 className="text-xl font-black text-red-400 uppercase tracking-wider">
                  {teamB.name}
                </h2>
                <div className="text-7xl font-mono font-black text-white bg-slate-950 py-3 rounded-xl border border-slate-800 shadow-inner">
                  {getTeamTotalPoints(teamB)}
                </div>
                <div className="flex justify-between items-center px-2 text-xs font-semibold">
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      teamFouls[quarter].B >= 4
                        ? "bg-red-600 text-white animate-pulse"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    Faltas Q{quarter}: {teamFouls[quarter].B}{" "}
                    {teamFouls[quarter].B >= 4 && "(BONUS)"}
                  </span>
                  <button
                    onClick={() => addTimeout("B")}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded border border-slate-700"
                  >
                    + TM
                  </button>
                  <span className="text-slate-400">
                    TM: <strong className="text-white">{teamB.timeouts}/3</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* TABLAS CON SECCIÓN DE CANCHA Y BANCO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderTeamPlayers(teamA, "A", "border-blue-900/50")}
              {renderTeamPlayers(teamB, "B", "border-red-900/50")}
            </div>

            {/* BOTÓN EXPORTAR PDF */}
            <div className="pt-2">
              <button
                onClick={exportPDF}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl text-lg shadow-xl transition uppercase tracking-wider flex justify-center items-center gap-2"
              >
                📄 Descargar Planilla Estadística en PDF
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}