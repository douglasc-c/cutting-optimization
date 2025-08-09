import { useState } from 'react'
import './App.css'

function App() {
  // Estado para armazenar as peças
  const [pecas, setPecas] = useState<{ largura: number; altura: number; quantidade: number }[]>([])
  const [form, setForm] = useState({ largura: '', altura: '', quantidade: '' })
  const [larguraRolo, setLarguraRolo] = useState(1200)
  const [comprimentoRolo, setComprimentoRolo] = useState('')
  const [arranjo, setArranjo] = useState<{ x: number; y: number; largura: number; altura: number }[]>([])

  // Função para lidar com mudanças no formulário
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Função para adicionar peça
  function adicionarPeca(e: React.FormEvent) {
    e.preventDefault()
    if (!form.largura || !form.altura || !form.quantidade) return
    setPecas([
      ...pecas,
      {
        largura: Number(form.largura),
        altura: Number(form.altura),
        quantidade: Number(form.quantidade),
      },
    ])
    setForm({ largura: '', altura: '', quantidade: '' })
  }

  // Função FFDH otimizada para preencher prateleiras misturando peças
  function calcularArranjo() {
    // Expande as peças pela quantidade
    let todasPecas = pecas.flatMap(peca => Array(peca.quantidade).fill({ largura: peca.largura, altura: peca.altura }))
    // Ordena por altura decrescente
    todasPecas = todasPecas.sort((a, b) => b.altura - a.altura)
    const resultado: { x: number; y: number; largura: number; altura: number }[] = []
    let y = 0
    let comprimentoTotal = 0
    const comprimentoMax = Number(comprimentoRolo) > 0 ? Number(comprimentoRolo) : Infinity
    while (todasPecas.length > 0) {
      let x = 0
      const shelfAltura = todasPecas[0].altura // altura da maior peça disponível
      let i = 0
      // Preencher a prateleira com as peças que couberem
      while (i < todasPecas.length) {
        const peca = todasPecas[i]
        if (x + peca.largura <= larguraRolo) {
          // Só adiciona se não ultrapassar o comprimento máximo
          if (y + shelfAltura <= comprimentoMax) {
            resultado.push({ x, y, largura: peca.largura, altura: peca.altura })
            x += peca.largura
            // Remove a peça da lista
            todasPecas.splice(i, 1)
          } else {
            // Não cabe mais nenhuma peça
            i = todasPecas.length
          }
        } else {
          i++
        }
      }
      if (y + shelfAltura > comprimentoMax) break
      y += shelfAltura
      comprimentoTotal += shelfAltura
    }
    setArranjo(resultado)
    setComprimentoUtilizado(comprimentoTotal)
  }

  // Estado para comprimento total utilizado
  const [comprimentoUtilizado, setComprimentoUtilizado] = useState(0)

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Cadastro de Peças</h1>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Largura do rolo (mm):</label>
        <input
          type="number"
          value={larguraRolo}
          onChange={e => setLarguraRolo(Number(e.target.value))}
          className="border rounded px-2 py-1 w-32"
          min={1}
        />
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-semibold">Comprimento do rolo (mm, 0 = ilimitado):</label>
        <input
          type="number"
          value={comprimentoRolo}
          onChange={e => setComprimentoRolo(e.target.value)}
          className="border rounded px-2 py-1 w-32"
          min={0}
        />
      </div>
      <form onSubmit={adicionarPeca} className="flex gap-2 mb-4">
        <input
          type="number"
          name="largura"
          placeholder="Largura"
          value={form.largura}
          onChange={handleChange}
          className="border rounded px-2 py-1 w-24"
          min={1}
          required
        />
        <input
          type="number"
          name="altura"
          placeholder="Altura"
          value={form.altura}
          onChange={handleChange}
          className="border rounded px-2 py-1 w-24"
          min={1}
          required
        />
        <input
          type="number"
          name="quantidade"
          placeholder="Qtd."
          value={form.quantidade}
          onChange={handleChange}
          className="border rounded px-2 py-1 w-20"
          min={1}
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded">Adicionar</button>
      </form>
      <h2 className="text-lg font-semibold mb-2">Peças cadastradas</h2>
      <ul className="space-y-1 mb-4">
        {pecas.map((peca, idx) => (
          <li key={idx} className="border rounded px-2 py-1 flex gap-4 items-center">
            <span>Largura: {peca.largura}mm</span>
            <span>Altura: {peca.altura}mm</span>
            <span>Qtd: {peca.quantidade}</span>
          </li>
        ))}
        {pecas.length === 0 && <li className="text-gray-500">Nenhuma peça cadastrada.</li>}
      </ul>
      <button
        onClick={calcularArranjo}
        className="bg-green-600 text-white px-4 py-2 rounded mb-4"
        disabled={pecas.length === 0}
      >
        Calcular arranjo (Shelf)
      </button>
      {arranjo.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Arranjo calculado</h2>
          <ul className="space-y-1 mb-4">
            {arranjo.map((p, idx) => (
              <li key={idx} className="border rounded px-2 py-1 flex gap-4 items-center">
                <span>Posição: ({p.x}, {p.y})</span>
                <span>Largura: {p.largura}mm</span>
                <span>Altura: {p.altura}mm</span>
              </li>
            ))}
          </ul>
          {/* Visualização gráfica em escala reduzida */}
          {(() => {
            const escala = 5; // 1px = 5mm
            const larguraPx = larguraRolo / escala;
            const comprimentoPx = (Number(comprimentoRolo) > 0 ? Number(comprimentoRolo) : comprimentoUtilizado) / escala;
            return (
              <div
                className="relative border-2 border-black bg-gray-100 mb-4"
                style={{ width: larguraPx + 'px', height: comprimentoPx + 'px', maxWidth: '100%', overflow: 'auto' }}
              >
                {/* Contorno do rolo */}
                <div
                  className="absolute border-2 border-dashed border-blue-500"
                  style={{
                    left: 0,
                    top: 0,
                    width: larguraPx,
                    height: comprimentoPx,
                    pointerEvents: 'none',
                  }}
                />
                {/* Peças */}
                {arranjo.map((p, idx) => (
                  <div
                    key={idx}
                    className="absolute flex items-center justify-center text-[10px] font-bold text-white border"
                    style={{
                      left: p.x / escala,
                      top: p.y / escala,
                      width: p.largura / escala,
                      height: p.altura / escala,
                      background: `hsl(${(idx * 47) % 360}, 70%, 50%)`,
                      borderColor: '#333',
                    }}
                    title={`Largura: ${p.largura}mm, Altura: ${p.altura}mm`}
                  >X
                    {p.largura} x {p.altura}
                  </div>
                ))}
              </div>
            )
          })()}
          {/* Comprimento total utilizado */}
          <div className="mb-2 font-semibold">
            Comprimento total utilizado do rolo: {comprimentoUtilizado} mm
          </div>
        </div>
      )}
    </div>
  )
}

export default App
