/**
 * BigFish — Gaussian Copula for Correlation Modeling
 * 
 * Implements the Gaussian Copula framework for generating correlated
 * random samples from arbitrary marginal distributions. This is the
 * mathematical backbone of the SGP (Same-Game Parlay) correlation engine.
 * 
 * Key operations:
 * 1. Cholesky decomposition for correlation matrix factoring
 * 2. Generation of correlated standard normal samples
 * 3. Mapping to uniform marginals via Φ (CDF)
 * 4. Inverse CDF transformation to target distributions
 */

/**
 * Cholesky decomposition of a positive-definite correlation matrix
 * Returns lower triangular matrix L where Σ = L × L^T
 * 
 * @param {number[][]} matrix - Correlation matrix (n×n)
 * @returns {number[][]} Lower triangular Cholesky factor
 */
export function choleskyDecomposition(matrix) {
  const n = matrix.length;
  const L = Array.from({ length: n }, () => new Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(0, matrix[i][i] - sum));
      } else {
        L[i][j] = L[j][j] !== 0 ? (matrix[i][j] - sum) / L[j][j] : 0;
      }
    }
  }
  return L;
}

/**
 * Standard Normal CDF (Φ) — Approximation using the error function
 * @param {number} x - Value
 * @returns {number} Cumulative probability
 */
export function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Inverse Standard Normal CDF (Φ⁻¹) — Rational approximation
 * @param {number} p - Probability (0 < p < 1)
 * @returns {number} Standard normal quantile
 */
export function normalInvCDF(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Rational approximation (Abramowitz & Stegun)
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q, r;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

/**
 * Generate correlated uniform random samples using the Gaussian Copula
 * 
 * Algorithm:
 * 1. Generate independent standard normal samples Z
 * 2. Apply Cholesky factor: X = L × Z (creates correlation)
 * 3. Transform to uniform via Φ: U = Φ(X)
 * 
 * @param {number} nSamples - Number of samples to generate
 * @param {number[][]} correlationMatrix - Correlation matrix
 * @param {Function} [rng] - Random number generator (default: Math.random)
 * @returns {number[][]} Array of correlated uniform [0,1] samples
 */
export function generateCorrelatedSamples(nSamples, correlationMatrix, rng = Math.random) {
  const n = correlationMatrix.length;
  const L = choleskyDecomposition(correlationMatrix);
  const samples = [];
  
  for (let s = 0; s < nSamples; s++) {
    // Generate independent standard normals using Box-Muller
    const Z = [];
    for (let i = 0; i < n; i++) {
      const u1 = rng();
      const u2 = rng();
      Z.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
    }
    
    // Apply Cholesky factor: X = L × Z
    const X = [];
    for (let i = 0; i < n; i++) {
      let val = 0;
      for (let j = 0; j <= i; j++) {
        val += L[i][j] * Z[j];
      }
      X.push(val);
    }
    
    // Transform to uniform via normal CDF
    const U = X.map(x => normalCDF(x));
    samples.push(U);
  }
  
  return samples;
}

/**
 * Build a correlation matrix from pairwise correlations
 * 
 * @param {number} n - Number of variables
 * @param {Object} correlations - Map of "{i},{j}" to correlation value
 * @returns {number[][]} n×n correlation matrix
 */
export function buildCorrelationMatrix(n, correlations = {}) {
  const matrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1.0;
      const key1 = `${i},${j}`;
      const key2 = `${j},${i}`;
      return correlations[key1] || correlations[key2] || 0;
    })
  );
  return matrix;
}

/**
 * Inverse Poisson CDF — Maps uniform [0,1] to Poisson-distributed value
 * Uses the cumulative Poisson PMF to find the quantile
 * 
 * @param {number} u - Uniform random value in [0,1]
 * @param {number} lambda - Poisson rate parameter
 * @returns {number} Integer Poisson-distributed value
 */
export function inversePoissonCDF(u, lambda) {
  if (lambda <= 0) return 0;
  let cumProb = 0;
  let k = 0;
  const maxK = Math.max(20, lambda * 3);
  
  while (k < maxK) {
    // Poisson PMF
    let logP = -lambda + k * Math.log(lambda);
    for (let i = 2; i <= k; i++) logP -= Math.log(i);
    cumProb += Math.exp(logP);
    
    if (cumProb >= u) return k;
    k++;
  }
  return k;
}
