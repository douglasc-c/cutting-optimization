import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  window.electronAPI = { optimizeCutting: jest.fn() } as any;
});

test('renders cutting configuration', () => {
  render(<App />);
  expect(screen.getByText('Peças a Cortar')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:/Otimizar Corte/})).toBeInTheDocument();
});

test('backend failure is displayed without accessing missing result', async () => {
  (window.electronAPI.optimizeCutting as jest.Mock).mockResolvedValue({success:false,error:'Não foi encontrado encaixe'});
  render(<App />);
  fireEvent.click(screen.getByRole('button',{name:/Otimizar Corte/}));
  await waitFor(() => expect(screen.getByText('Não foi encontrado encaixe')).toBeInTheDocument());
  expect(screen.queryByText('✅ Resultados da Otimização')).not.toBeInTheDocument();
});

test('changing inputs does not change the calculated SVG dimensions', async () => {
  jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({font:'',measureText:(text:string)=>({width:text.length*4})} as any);
  (window.electronAPI.optimizeCutting as jest.Mock).mockResolvedValue({success:true,algorithm:'fast',result:{
    pieces_placed:[{id:'piece_0_0',x:0,y:0,width:20,height:30,area:600,description:'Porta'}],
    stock_dimensions:{width:100,height:30},stock_used:1,waste_percentage:80,execution_time:0.01,is_optimal:false,total_area:3000,used_area:600
  },efficiency_metrics:{area_efficiency:20}});
  const {container}=render(<App />);
  fireEvent.click(screen.getByRole('button',{name:/Otimizar Corte/}));
  await waitFor(()=>expect(container.querySelector('.cutting-svg')).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText('Largura (cm):'),{target:{value:'200'}});
  expect(container.querySelector('.cutting-svg')).toHaveAttribute('viewBox','0 0 100 30');
  jest.restoreAllMocks();
});
