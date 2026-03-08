import math
import statistics as _stats


class WelfordAccumulator:
    """
    Knuth/Welford online algorithm for numerically stable mean + variance.

    Update rule per new value x:
        delta  = x - mean
        mean  += delta / n
        M2    += delta * (x - mean)   # uses the already-updated mean
        variance = M2 / (n - 1)       # Bessel-corrected sample variance

    Why not the naive (sum_x2/n - mean^2) formula?
    At large n or with close floating-point values, the naive form suffers
    catastrophic cancellation. Welford's accumulates deviations directly,
    so it remains stable at any n.

    O(1) time and O(1) space per update.
    """

    __slots__ = ('n', 'mean', '_M2')

    def __init__(self):
        self.n    = 0
        self.mean = 0.0
        self._M2  = 0.0

    def update(self, x: float):
        self.n   += 1
        delta     = x - self.mean
        self.mean += delta / self.n
        self._M2  += delta * (x - self.mean)   # note: uses updated mean

    def remove(self, x: float):
        """
        Inverse (downdate) Welford — numerically stable removal.
        Allows O(1) correction when a review is edited or deleted without
        reprocessing all remaining ratings.
        """
        if self.n == 0:
            return
        if self.n == 1:
            self.n    = 0
            self.mean = 0.0
            self._M2  = 0.0
            return
        old_mean  = (self.mean * self.n - x) / (self.n - 1)
        self._M2 -= (x - self.mean) * (x - old_mean)
        self.mean = old_mean
        self.n   -= 1

    @property
    def variance(self) -> float:
        """Sample variance (Bessel-corrected: divides by n-1)."""
        return self._M2 / (self.n - 1) if self.n > 1 else 0.0

    @property
    def std(self) -> float:
        return math.sqrt(self.variance)

    @property
    def sharpe_analog(self) -> float | None:
        """
        mean / std — quality-adjusted rating score.

        Penalises divisive meals even when their mean is high:
          meal A: mean=4.5, std=0.3  → sharpe=15.0  (great, everyone agrees)
          meal B: mean=4.5, std=1.6  → sharpe=2.8   (same mean, deeply polarising)

        Returns None when std == 0 (unanimous rating) to signal perfect
        consensus rather than a meaningless division.
        """
        return round(self.mean / self.std, 3) if self.std > 0 else None


def welford_from_list(ratings: list[float]) -> dict:
    """
    Compute Welford stats from a complete list of ratings.
    Returns a dict with keys: mean, std, variance, n, sharpe_analog.
    """
    acc = WelfordAccumulator()
    for r in ratings:
        acc.update(r)
    if acc.n == 0:
        return {'mean': None, 'std': None, 'variance': None, 'n': 0, 'sharpe_analog': None}
    return {
        'mean':          round(acc.mean, 2),
        'std':           round(acc.std, 3),
        'variance':      round(acc.variance, 4),
        'n':             acc.n,
        'sharpe_analog': acc.sharpe_analog,
    }


def apply_ewma(series: list[float], decay: float = 0.94) -> list[float]:
    """
    Exponentially Weighted Moving Average over an ordered list of values.

    EWMA_n = λ · EWMA_{n-1} + (1-λ) · x_n

    λ (decay) controls memory length:
      λ = 0.94  → half-life ≈ 11.2 periods  (RiskMetrics standard for daily data)
      λ = 0.70  → half-life ≈ 1.9 periods   (very reactive)

    The half-life formula:  t½ = -ln(2) / ln(λ)

    Older data points receive exponentially less weight than recent ones,
    preventing a single outlier week from permanently distorting the trend.
    Unlike a simple N-week moving average there is no hard cliff edge where
    old data is abruptly dropped.

    Returns a list of the same length as the input.
    """
    if not series:
        return []
    result = [series[0]]
    for x in series[1:]:
        result.append(decay * result[-1] + (1 - decay) * x)
    return [round(v, 3) for v in result]


def apply_zscores(items: list[dict], key: str = 'avg_rating') -> list[dict]:
    """
    Cross-sectional z-score normalisation.

    z_i = (x_i - μ) / σ

    μ and σ are computed across all items in the list (cross-sectional),
    not along a single item's time series. This answers: "how many standard
    deviations above or below the chapter's own baseline is this meal?"

    A z-score of +2.0 means genuinely exceptional.
    A z-score of -1.5 is a signal to retire the dish.

    Uses sample std (n-1 denominator via statistics.stdev).
    Adds a 'rating_zscore' key to each dict in-place. Returns the same list.
    """
    values = [item[key] for item in items if item.get(key) is not None]
    if len(values) < 2:
        for item in items:
            item['rating_zscore'] = None
        return items

    mu    = _stats.mean(values)
    sigma = _stats.stdev(values)

    for item in items:
        v = item.get(key)
        if v is not None and sigma > 0:
            item['rating_zscore'] = round((v - mu) / sigma, 3)
        else:
            item['rating_zscore'] = None
    return items
