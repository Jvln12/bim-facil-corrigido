import React, { useEffect, useRef, useState } from "react";
import { IfcViewerAPI } from "web-ifc-viewer";
import { Button } from "@/components/ui/button";
import * as THREE from "three";
import { 
  IFCWALL, 
  IFCDOOR, 
  IFCWINDOW, 
  IFCSLAB, 
  IFCCOLUMN, 
  IFCBEAM 
} from "web-ifc";
import '../../App.css';

export default function BimMvpViewer() {
  const containerRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Nenhum arquivo carregado.");
  const [fileName, setFileName] = useState("");
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (containerRef.current && !viewer) {
      const container = containerRef.current;
      const ifcViewer = new IfcViewerAPI({
        container,
        backgroundColor: new THREE.Color(0xffffff)
      });
      
      ifcViewer.axes.setAxes();
      ifcViewer.grid.setGrid();
      
      setViewer(ifcViewer);
    }

    return () => {
      if (viewer) {
        viewer.dispose();
      }
    };
  }, []);

  const onFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".ifc")) {
      setMessage("Por favor, selecione um arquivo .IFC válido.");
      return;
    }

    setLoading(true);
    setMessage("Carregando arquivo IFC...");
    setFileName(file.name);

    try {
      if (viewer) {
        const model = await viewer.IFC.loadIfc(file);
        setMessage("Arquivo carregado com sucesso!");
        
        // Extrair quantitativos básicos
        await extractQuantities(model);
      }
    } catch (error) {
      console.error("Erro ao carregar arquivo IFC:", error);
      setMessage("Erro ao carregar o arquivo. Verifique se é um arquivo IFC válido.");
    } finally {
      setLoading(false);
    }
  };

  const extractQuantities = async (model) => {
    try {
      const ifcAPI = viewer.IFC.loader.ifcManager;
      const modelID = model.modelID;
      
      // Categorias básicas para contar
      const categories = {
        "Paredes": await ifcAPI.getAllItemsOfType(modelID, IFCWALL, false),
        "Portas": await ifcAPI.getAllItemsOfType(modelID, IFCDOOR, false),
        "Janelas": await ifcAPI.getAllItemsOfType(modelID, IFCWINDOW, false),
        "Lajes": await ifcAPI.getAllItemsOfType(modelID, IFCSLAB, false),
        "Pilares": await ifcAPI.getAllItemsOfType(modelID, IFCCOLUMN, false),
        "Vigas": await ifcAPI.getAllItemsOfType(modelID, IFCBEAM, false)
      };

      const newCounts = {};
      Object.entries(categories).forEach(([name, items]) => {
        newCounts[name] = items.length;
      });

      setCounts(newCounts);
    } catch (error) {
      console.error("Erro ao extrair quantitativos:", error);
      setMessage("Modelo carregado, mas houve erro ao extrair quantitativos.");
    }
  };

  const downloadCSV = () => {
    if (Object.keys(counts).length === 0) return;

    const csvContent = "Categoria,Quantidade\n" + 
      Object.entries(counts)
        .map(([category, count]) => `${category},${count}`)
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `quantitativos_${fileName.replace(".ifc", "")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="p-6 border-b bg-white">
        <h1 className="text-2xl font-bold">BIM Fácil + IA — MVP Viewer</h1>
        <p className="text-sm text-gray-600 mt-1">
          Carregue um arquivo <code>.IFC</code> para visualizar em 3D e extrair contagens básicas 
          (paredes, portas, janelas, lajes, pilares e vigas).
        </p>
      </header>

      <main className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel esquerdo: controles e dados */}
        <section className="lg:col-span-1 space-y-4">
          <div className="p-4 bg-white rounded-2xl shadow">
            <label className="block text-sm font-medium mb-2">Enviar arquivo IFC</label>
            <input 
              type="file" 
              accept=".ifc" 
              onChange={onFileChange} 
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            />
            <p className="text-xs text-gray-500 mt-2">{message}</p>
            {fileName && (
              <p className="text-xs text-gray-700 mt-1">
                Arquivo: <span className="font-medium">{fileName}</span>
              </p>
            )}
          </div>

          <div className="p-4 bg-white rounded-2xl shadow">
            <h2 className="text-lg font-semibold mb-3">Quantitativos (contagens)</h2>
            <ul className="space-y-2">
              {Object.keys(counts).length === 0 && (
                <li className="text-sm text-gray-500">Nenhum dado ainda.</li>
              )}
              {Object.entries(counts).map(([k, v]) => (
                <li key={k} className="flex justify-between text-sm">
                  <span>{k}</span>
                  <span className="font-semibold">{v}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={downloadCSV}
              disabled={Object.keys(counts).length === 0}
              className="mt-4 w-full"
            >
              Exportar CSV
            </Button>
          </div>

          <div className="p-4 bg-white rounded-2xl shadow text-sm text-gray-600">
            <h3 className="font-semibold mb-2">Como funciona</h3>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Escolha um arquivo <code>.IFC</code> (modelo BIM aberto).</li>
              <li>O modelo é processado localmente no seu navegador (sem enviar para servidor).</li>
              <li>As contagens básicas por categoria são exibidas e podem ser exportadas para CSV.</li>
            </ol>
            <p className="mt-3">
              ⚠️ Observação: métricas de área/volume dependem de QTOs no IFC. Entrarão na V2.
            </p>
          </div>
        </section>

        {/* Painel direito: viewer 3D */}
        <section className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="text-sm text-gray-700">Visualização 3D</span>
              {loading && <span className="text-xs">Carregando…</span>}
            </div>
            <div ref={containerRef} className="h-[70vh] w-full" />
          </div>
        </section>
      </main>

      <footer className="p-6 text-center text-xs text-gray-500">
        MVP — BIM Fácil + IA • Cliente: Upload IFC → Visualização + Contagens • Próximo: 4D/5D
      </footer>
    </div>
  );
}

