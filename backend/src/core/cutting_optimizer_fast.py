"""Strip packing with Skyline and MaxRects, preserving each piece's constraints."""
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
import math
import random
import time


@dataclass
class Piece:
    width: int
    height: int
    quantity: int
    id: str = ""


@dataclass
class CuttingResult:
    pieces_placed: List[Dict]
    stock_used: int
    waste_percentage: float
    execution_time: float
    is_optimal: bool
    total_area: int
    used_area: int
    used_height: int


class FastCuttingOptimizer:
    def __init__(self, stock_width: int, stock_height: int,
                 pieces: List[Tuple], allow_rotation: bool = True):
        if stock_width <= 0 or stock_height <= 0:
            raise ValueError("Dimensões do material devem ser maiores que zero")
        self.stock_width, self.stock_height = stock_width, stock_height
        self.allow_rotation = allow_rotation
        self.stock_area = stock_width * stock_height
        self.flat_pieces = []
        for i, piece in enumerate(pieces):
            w, h, quantity = piece[:3]
            if w <= 0 or h <= 0 or quantity < 1:
                raise ValueError("Dimensões e quantidade das peças devem ser positivas")
            rot = allow_rotation and (bool(piece[3]) if len(piece) > 3 else True)
            description = str(piece[4]) if len(piece) > 4 else f"Peça {i + 1}"
            for q in range(quantity):
                self.flat_pieces.append(dict(base_id=f"piece_{i}_{q}", w=w, h=h,
                                             allow_rotation=rot, description=description))

    def _orientations(self, p):
        result = [(p['w'], p['h'], False)]
        if p['allow_rotation'] and p['w'] != p['h']:
            result.append((p['h'], p['w'], True))
        return result

    @staticmethod
    def _placed(p, x, y, w, h, rotated):
        return dict(id=p['base_id'] + ('_rot' if rotated else ''), x=x, y=y,
                    width=w, height=h, area=w*h, rotated=rotated,
                    description=p['description'], original_width=p['w'], original_height=p['h'])

    def _simulate_skyline_placement(self, sequence, deadline=None, minimize_height=True):
        skyline = [(0, 0, self.stock_width)]
        placed, used_height = [], 0
        for p in sequence:
            if deadline is not None and time.monotonic() >= deadline:
                break
            best = None
            for w, h, rotated in self._orientations(p):
                for i, (x, y, _) in enumerate(skyline):
                    if x + w > self.stock_width:
                        continue
                    remaining, j = w, i
                    while remaining > 0 and j < len(skyline):
                        y = max(y, skyline[j][1])
                        remaining -= skyline[j][2]
                        j += 1
                    if remaining > 0 or y + h > self.stock_height:
                        continue
                    score = (max(used_height, y+h), y, x, h) if minimize_height else (y,)
                    if best is None or score < best[0]:
                        best = (score, i, x, y, w, h, rotated)
            if best is None:
                continue
            _, i, x, y, w, h, rotated = best
            placed.append(self._placed(p, x, y, w, h, rotated))
            used_height = max(used_height, y+h)
            remaining = w
            while remaining and i < len(skyline):
                sx, sy, sw = skyline[i]
                if sw <= remaining:
                    remaining -= sw
                    skyline.pop(i)
                else:
                    skyline[i] = (sx+remaining, sy, sw-remaining)
                    remaining = 0
            skyline.insert(i, (x, y+h, w))
            merged = []
            for sx, sy, sw in skyline:
                if merged and merged[-1][1] == sy:
                    mx, my, mw = merged.pop()
                    merged.append((mx, my, mw+sw))
                else:
                    merged.append((sx, sy, sw))
            skyline = merged
        return placed, used_height

    @staticmethod
    def _split_free_rectangles(free, used, deadline=None):
        """Split every intersecting free rectangle; remove contained duplicates."""
        ux, uy, uw, uh = used
        split = []
        for x, y, w, h in free:
            if ux >= x+w or ux+uw <= x or uy >= y+h or uy+uh <= y:
                split.append((x, y, w, h))
                continue
            if ux > x:
                split.append((x, y, ux-x, h))
            if ux+uw < x+w:
                split.append((ux+uw, y, x+w-ux-uw, h))
            if uy > y:
                split.append((x, y, w, uy-y))
            if uy+uh < y+h:
                split.append((x, uy+uh, w, y+h-uy-uh))
        split = list(dict.fromkeys(split))
        result = []
        for i, (x, y, w, h) in enumerate(split):
            if deadline is not None and time.monotonic() >= deadline:
                # Unpruned free rectangles are still geometrically valid.
                return split
            if not any(i != j and x >= a and y >= b and x+w <= a+c and y+h <= b+d
                       for j, (a, b, c, d) in enumerate(split)):
                result.append((x, y, w, h))
        return result

    def _simulate_maxrects(self, sequence, height, rule='short', deadline=None):
        free = [(0, 0, self.stock_width, height)]
        placed, used_height = [], 0
        for p in sequence:
            if deadline is not None and time.monotonic() >= deadline:
                break
            best = None
            for w, h, rotated in self._orientations(p):
                for x, y, fw, fh in free:
                    if w > fw or h > fh:
                        continue
                    short, long = sorted((fw-w, fh-h))
                    if rule == 'short':
                        score = (short, long, max(used_height, y+h), y, x)
                    elif rule == 'area':
                        score = (fw*fh-w*h, short, max(used_height, y+h), y, x)
                    else:
                        score = (max(used_height, y+h), y, short, x)
                    if best is None or score < best[0]:
                        best = (score, x, y, w, h, rotated)
            if best is None:
                continue
            _, x, y, w, h, rotated = best
            placed.append(self._placed(p, x, y, w, h, rotated))
            used_height = max(used_height, y+h)
            free = self._split_free_rectangles(free, (x, y, w, h), deadline)
        return placed, used_height

    def optimize(self, time_limit=30, optimization_mode='refined',
                 max_attempts_without_improvement: Optional[int] = None):
        start = time.monotonic()
        deadline = start + max(0.01, float(time_limit))
        if not self.flat_pieces:
            raise ValueError("Adicione pelo menos uma peça")
        area = sum(p['w']*p['h'] for p in self.flat_pieces)
        min_heights = []
        baseline, y = [], 0
        for p in self.flat_pieces:
            options = [(w,h,r) for w,h,r in self._orientations(p) if w <= self.stock_width]
            if not options:
                raise ValueError(f"A peça '{p['description']}' não cabe na largura do material")
            w,h,r = min(options, key=lambda item: (item[1], item[0]))
            min_heights.append(h)
            baseline.append(self._placed(p, 0, y, w, h, r))
            y += h
        lower = max(math.ceil(area/self.stock_width), max(min_heights))
        best, best_height = (baseline, y) if y <= self.stock_height else ([], self.stock_height+1)
        self.lower_bound_height = lower
        orders = [sorted(self.flat_pieces, key=key, reverse=True) for key in (
            lambda p: p['w']*p['h'], lambda p: max(p['w'],p['h']),
            lambda p: p['w'], lambda p: p['h'], lambda p: min(p['w'],p['h']))]
        rng = random.Random(0)
        stale, attempts = 0, 0
        stale_limit = max_attempts_without_improvement or (12 if optimization_mode == 'fast' else 60)
        rounds = 2 if optimization_mode == 'fast' else 4
        limit = len(orders) + rounds*len(self.flat_pieces)
        while attempts < limit and stale < stale_limit and time.monotonic() < deadline:
            if best and best_height == lower:
                break  # Matching the area/geometry bound proves minimum integer length.
            if attempts < len(orders):
                sequence = orders[attempts]
            else:
                # Local swaps explore neighbors of the best layout, with random restarts.
                lookup = {p['base_id']: p for p in self.flat_pieces}
                sequence = [lookup[p['id'].removesuffix('_rot')] for p in best] if best else list(self.flat_pieces)
                if attempts % 3 == 0:
                    rng.shuffle(sequence)
                elif len(sequence) > 1:
                    i,j = rng.sample(range(len(sequence)),2)
                    sequence[i],sequence[j] = sequence[j],sequence[i]
            attempts += 1
            previous = best_height
            for minimize_height in (True, False):
                placed, height = self._simulate_skyline_placement(sequence, deadline, minimize_height)
                if len(placed) == len(sequence) and height < best_height:
                    best, best_height = placed, height
            # Try compact target heights first; failed heuristic fits are NOT proofs of infeasibility.
            targets = [lower, max(lower,(lower+best_height)//2), min(self.stock_height,best_height-1)]
            for target in dict.fromkeys(targets):
                if target < lower or target >= best_height:
                    continue
                for rule in ('short', 'area', 'bottom'):
                    if time.monotonic() >= deadline or best_height == lower:
                        break
                    placed, height = self._simulate_maxrects(sequence, target, rule, deadline)
                    if len(placed) == len(sequence) and height < best_height:
                        best, best_height = placed, height
            stale = stale+1 if best_height == previous else 0
        if not best:
            raise ValueError("Não foi encontrado um encaixe para todas as peças no material informado")
        return CuttingResult(best, 1, (1-area/self.stock_area)*100,
                             time.monotonic()-start, best_height == lower,
                             self.stock_area, area, best_height)

    def get_statistics(self):
        area = sum(p['w']*p['h'] for p in self.flat_pieces)
        return dict(stock_dimensions=(self.stock_width,self.stock_height), stock_area=self.stock_area,
                    total_pieces=len(self.flat_pieces), total_piece_area=area,
                    theoretical_waste=(1-area/self.stock_area)*100,
                    allow_rotation=self.allow_rotation, guillotine_cut=False,
                    lower_bound_height=getattr(self,'lower_bound_height',0))


BestCuttingOptimizer = FastCuttingOptimizer
