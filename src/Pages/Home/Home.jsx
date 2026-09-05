import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Home() {
  // Estado general del partido
  const [matchStarted, setMatchStarted] = useState(false);
  const [teamA, setTeamA] = useState({ name: "Equipo Local", players: [] });
  const [teamB, setTeamB] = useState({ name: "Equipo Visitante", players: [] });

  // Formulario temporal de jugadores
  const [newPlayerA, setNewPlayerA] = useState({ name: "", number: "" });
  const [newPlayerB, setNewPlayerB] = useState({ name: "", number: "" });

  // Estado del reloj y marcador
  const [quarter, setQuarter] = useState(1);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos (600 s)
  const [isRunning, setIsRunning] = useState(false);

  // Cargar/Guardar datos en localStorage
  useEffect(() => {
    const savedData = localStorage.getItem("basketball_match");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setTeamA(parsed.teamA);
      setTeamB(parsed.teamB);
      setQuarter(parsed.quarter || 1);
      setMatchStarted(parsed.matchStarted || false);
    }
  }, []);

  useEffect(() => {
    if (matchStarted) {
      localStorage.setItem(
        "basketball_match",
        JSON.stringify({ teamA, teamB, quarter, matchStarted })
      );
    }
  }, [teamA, teamB, quarter, matchStarted]);

  // Manejo del cronómetro
  useEffect(() => {
    let timer = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  // Formatear segundos a MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Agregar jugadores
  const addPlayer = (team, player, setPlayer, setTeam) => {
    if (!player.name || !player.number) return;
    const newEntry = {
      id: Date.now(),
      name: player.name,
      number: player.number,
      points: 0,
      fouls: 0,
      rebounds: 0,
    };
    setTeam({ ...team, players: [...team.players, newEntry] });
    setPlayer({ name: "", number: "" });
  };

  // Registrar estadísticas de un jugador
  const updateStat = (teamType, playerId, statType, amount = 1) => {
    const updater = (prevTeam) => ({
      ...prevTeam,
      players: prevTeam.players.map((p) => {
        if (p.id === playerId) {
          const updatedValue = Math.max(0, (p[statType] || 0) + amount);
          return { ...p, [statType]: updatedValue };
        }
        return p;
      }),
    });

    if (teamType === "A") setTeamA(updater);
    if (teamType === "B") setTeamB(updater);
  };

  // Calcular totales por equipo
  const getTeamTotal = (team, stat) =>
    team.players.reduce((acc, curr) => acc + (curr[stat] || 0), 0);

  // Reiniciar/Finalizar partido
  const resetMatch = () => {
    if (window.confirm("¿Deseas iniciar un nuevo partido? Se borrarán los datos actuales.")) {
      localStorage.removeItem("basketball_match");
      setMatchStarted(false);
      setTeamA({ name: "Equipo Local", players: [] });
      setTeamB({ name: "Equipo Visitante", players: [] });
      setQuarter(1);
      setTimeLeft(600);
      setIsRunning(false);
    }
  };

  // Exportar PDF
  const exportPDF = () => {
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(18);
    doc.text("Planilla Estadística de Básquetbol", 14, 20);
    doc.setFontSize(12);
    doc.text(`Resultado Final: ${teamA.name} ${getTeamTotal(teamA, "points")} - ${getTeamTotal(teamB, "points")} ${teamB.name}`, 14, 30);
    doc.text(`Cuartos Jugados: ${quarter}`, 14, 37);

    // Tabla Equipo A
    doc.setFontSize(14);
    doc.text(`Equipo: ${teamA.name}`, 14, 48);

    const dataA = teamA.players.map((p) => [
      `#${p.number}`,
      p.name,
      p.points,
      p.fouls,
      p.rebounds,
    ]);

    autoTable(doc, {
      startY: 52,
      head: [["N°", "Jugador", "Puntos", "Faltas", "Rebotes"]],
      body: dataA,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
    });

    // Tabla Equipo B
    const finalYA = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text(`Equipo: ${teamB.name}`, 14, finalYA);

    const dataB = teamB.players.map((p) => [
      `#${p.number}`,
      p.name,
      p.points,
      p.fouls,
      p.rebounds,
    ]);

    autoTable(doc, {
      startY: finalYA + 4,
      head: [["N°", "Jugador", "Puntos", "Faltas", "Rebotes"]],
      body: dataB,
      theme: "grid",
      headStyles: { fillColor: [192, 57, 43] },
    });

    doc.save(`estadisticas_${teamA.name}_vs_${teamB.name}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <header className="max-w-5xl mx-auto bg-blue-900 text-white p-4 rounded-lg shadow-md flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Planilla de Básquetbol</h1>
        {matchStarted && (
          <button
            onClick={resetMatch}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-semibold transition"
          >
            Nuevo Partido
          </button>
        )}
      </header>

      <main className="max-w-5xl mx-auto">
        {!matchStarted ? (
          /* CONFIGURACIÓN DE PARTIDO Y JUGADORES */
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Configurar Partido</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Equipo A */}
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <label className="block font-semibold mb-1 text-blue-900">Equipo Local (A)</label>
                <input
                  type="text"
                  value={teamA.name}
                  onChange={(e) => setTeamA({ ...teamA, name: e.target.value })}
                  className="w-full p-2 border rounded mb-4"
                  placeholder="Nombre del equipo"
                />

                <h4 className="font-semibold text-sm mb-2 text-gray-700">Agregar Jugador</h4>
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    placeholder="N°"
                    value={newPlayerA.number}
                    onChange={(e) => setNewPlayerA({ ...newPlayerA, number: e.target.value })}
                    className="w-20 p-2 border rounded"
                  />
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={newPlayerA.name}
                    onChange={(e) => setNewPlayerA({ ...newPlayerA, name: e.target.value })}
                    className="flex-1 p-2 border rounded"
                  />
                  <button
                    onClick={() => addPlayer(teamA, newPlayerA, setNewPlayerA, setTeamA)}
                    className="bg-blue-600 text-white px-3 py-2 rounded font-semibold hover:bg-blue-700"
                  >
                    +
                  </button>
                </div>

                <ul className="divide-y border-t">
                  {teamA.players.map((p) => (
                    <li key={p.id} className="py-1 text-sm flex justify-between">
                      <span>#{p.number} - {p.name}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Equipo B */}
              <div className="bg-red-50 p-4 rounded-md border border-red-200">
                <label className="block font-semibold mb-1 text-red-900">Equipo Visitante (B)</label>
                <input
                  type="text"
                  value={teamB.name}
                  onChange={(e) => setTeamB({ ...teamB, name: e.target.value })}
                  className="w-full p-2 border rounded mb-4"
                  placeholder="Nombre del equipo"
                />

                <h4 className="font-semibold text-sm mb-2 text-gray-700">Agregar Jugador</h4>
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    placeholder="N°"
                    value={newPlayerB.number}
                    onChange={(e) => setNewPlayerB({ ...newPlayerB, number: e.target.value })}
                    className="w-20 p-2 border rounded"
                  />
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={newPlayerB.name}
                    onChange={(e) => setNewPlayerB({ ...newPlayerB, name: e.target.value })}
                    className="flex-1 p-2 border rounded"
                  />
                  <button
                    onClick={() => addPlayer(teamB, newPlayerB, setNewPlayerB, setTeamB)}
                    className="bg-red-600 text-white px-3 py-2 rounded font-semibold hover:bg-red-700"
                  >
                    +
                  </button>
                </div>

                <ul className="divide-y border-t">
                  {teamB.players.map((p) => (
                    <li key={p.id} className="py-1 text-sm flex justify-between">
                      <span>#{p.number} - {p.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => setMatchStarted(true)}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-green-700 shadow transition"
            >
              Comenzar Partido
            </button>
          </div>
        ) : (
          /* MESA DE CONTROL Y PANEL DEL PARTIDO */
          <div className="space-y-6">
            {/* MARCADOR GENERAL Y CRONÓMETRO */}
            <div className="bg-gray-900 text-white p-6 rounded-lg shadow-md grid grid-cols-1 md:grid-cols-3 gap-4 text-center items-center">
              <div>
                <h2 className="text-xl font-bold text-blue-400">{teamA.name}</h2>
                <p className="text-6xl font-black my-2">{getTeamTotal(teamA, "points")}</p>
              </div>

              <div className="border-y md:border-y-0 md:border-x border-gray-700 py-4">
                <p className="text-sm text-gray-400 uppercase tracking-widest mb-1">Cuarto {quarter}</p>
                <div className="text-5xl font-mono font-bold tracking-wider mb-3">
                  {formatTime(timeLeft)}
                </div>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={`px-4 py-1.5 rounded font-bold text-sm ${
                      isRunning ? "bg-amber-500 hover:bg-amber-600" : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {isRunning ? "Pausar" : "Iniciar"}
                  </button>
                  <button
                    onClick={() => {
                      setIsRunning(false);
                      setTimeLeft(600);
                    }}
                    className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-xs"
                  >
                    Reiniciar Reloj
                  </button>
                  <button
                    onClick={() => setQuarter((q) => q + 1)}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-xs"
                  >
                    Sig. Cuarto
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-red-400">{teamB.name}</h2>
                <p className="text-6xl font-black my-2">{getTeamTotal(teamB, "points")}</p>
              </div>
            </div>

            {/* TABLA DE JUGADORES Y ACCIONES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Equipo A - Control */}
              <div className="bg-white p-4 rounded-lg shadow border-t-4 border-blue-600">
                <h3 className="font-bold text-lg mb-3 text-blue-900">{teamA.name} - Jugadores</h3>
                <div className="space-y-3">
                  {teamA.players.map((p) => (
                    <div key={p.id} className="p-3 bg-gray-50 rounded border flex flex-col gap-2">
                      <div className="flex justify-between items-center font-bold">
                        <span>#{p.number} {p.name}</span>
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {p.points} pts | {p.fouls} faltas
                        </span>
                      </div>
                      <div className="flex gap-1 text-xs">
                        <button
                          onClick={() => updateStat("A", p.id, "points", 1)}
                          className="flex-1 bg-blue-500 text-white py-1 rounded hover:bg-blue-600"
                        >
                          +1 Pt
                        </button>
                        <button
                          onClick={() => updateStat("A", p.id, "points", 2)}
                          className="flex-1 bg-blue-600 text-white py-1 rounded hover:bg-blue-700"
                        >
                          +2 Pts
                        </button>
                        <button
                          onClick={() => updateStat("A", p.id, "points", 3)}
                          className="flex-1 bg-blue-700 text-white py-1 rounded hover:bg-blue-800"
                        >
                          +3 Pts
                        </button>
                        <button
                          onClick={() => updateStat("A", p.id, "fouls", 1)}
                          className="flex-1 bg-amber-500 text-white py-1 rounded hover:bg-amber-600"
                        >
                          Falta
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipo B - Control */}
              <div className="bg-white p-4 rounded-lg shadow border-t-4 border-red-600">
                <h3 className="font-bold text-lg mb-3 text-red-900">{teamB.name} - Jugadores</h3>
                <div className="space-y-3">
                  {teamB.players.map((p) => (
                    <div key={p.id} className="p-3 bg-gray-50 rounded border flex flex-col gap-2">
                      <div className="flex justify-between items-center font-bold">
                        <span>#{p.number} {p.name}</span>
                        <span className="text-sm bg-red-100 text-red-800 px-2 py-0.5 rounded">
                          {p.points} pts | {p.fouls} faltas
                        </span>
                      </div>
                      <div className="flex gap-1 text-xs">
                        <button
                          onClick={() => updateStat("B", p.id, "points", 1)}
                          className="flex-1 bg-red-500 text-white py-1 rounded hover:bg-red-600"
                        >
                          +1 Pt
                        </button>
                        <button
                          onClick={() => updateStat("B", p.id, "points", 2)}
                          className="flex-1 bg-red-600 text-white py-1 rounded hover:bg-red-700"
                        >
                          +2 Pts
                        </button>
                        <button
                          onClick={() => updateStat("B", p.id, "points", 3)}
                          className="flex-1 bg-red-700 text-white py-1 rounded hover:bg-red-800"
                        >
                          +3 Pts
                        </button>
                        <button
                          onClick={() => updateStat("B", p.id, "fouls", 1)}
                          className="flex-1 bg-amber-500 text-white py-1 rounded hover:bg-amber-600"
                        >
                          Falta
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* BOTÓN DESCARGA PDF */}
            <div className="pt-4">
              <button
                onClick={exportPDF}
                className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-emerald-700 shadow transition flex justify-center items-center gap-2"
              >
                Exportar Planilla en PDF
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}