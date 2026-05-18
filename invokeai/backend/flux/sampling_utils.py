# Initially pulled from https://github.com/black-forest-labs/flux

import math
from typing import Callable

import torch
from einops import rearrange, repeat


def get_noise(
    num_samples: int,
    height: int,
    width: int,
    device: torch.device,
    dtype: torch.dtype,
    seed: int,
):
    # We always generate noise on the same device and dtype then cast to ensure consistency across devices/dtypes.
    rand_device = "cpu"
    rand_dtype = torch.float16
    return torch.randn(
        num_samples,
        16,
        # allow for packing
        2 * math.ceil(height / 16),
        2 * math.ceil(width / 16),
        device=rand_device,
        dtype=rand_dtype,
        generator=torch.Generator(device=rand_device).manual_seed(seed),
    ).to(device=device, dtype=dtype)


def time_shift(mu: float, sigma: float, t: torch.Tensor) -> torch.Tensor:
    return math.exp(mu) / (math.exp(mu) + (1 / t - 1) ** sigma)


def get_lin_function(x1: float = 256, y1: float = 0.5, x2: float = 4096, y2: float = 1.15) -> Callable[[float], float]:
    m = (y2 - y1) / (x2 - x1)
    b = y1 - m * x1
    return lambda x: m * x + b


def get_schedule(
    num_steps: int,
    image_seq_len: int,
    base_shift: float = 0.5,
    max_shift: float = 1.15,
    shift: bool = True,
) -> list[float]:
    # extra step for zero
    timesteps = torch.linspace(1, 0, num_steps + 1)

    # shifting the schedule to favor high timesteps for higher signal images
    if shift:
        # estimate mu based on linear estimation between two points
        mu = get_lin_function(y1=base_shift, y2=max_shift)(image_seq_len)
        timesteps = time_shift(mu, 1.0, timesteps)

    return timesteps.tolist()


def _find_last_index_ge_val(timesteps: list[float], val: float, eps: float = 1e-6) -> int:
    """Find the last index in timesteps that is >= val.

    We use epsilon-close equality to avoid potential floating point errors.
    """
    idx = len(list(filter(lambda t: t >= (val - eps), timesteps))) - 1
    assert idx >= 0
    return idx


def clip_timestep_schedule(timesteps: list[float], denoising_start: float, denoising_end: float) -> list[float]:
    """Clip the timestep schedule to the denoising range.

    Args:
        timesteps (list[float]): The original timestep schedule: [1.0, ..., 0.0].
        denoising_start (float): A value in [0, 1] specifying the start of the denoising process. E.g. a value of 0.2
            would mean that the denoising process start at the last timestep in the schedule >= 0.8.
        denoising_end (float): A value in [0, 1] specifying the end of the denoising process. E.g. a value of 0.8 would
            mean that the denoising process end at the last timestep in the schedule >= 0.2.

    Returns:
        list[float]: The clipped timestep schedule.
    """
    assert 0.0 <= denoising_start <= 1.0
    assert 0.0 <= denoising_end <= 1.0
    assert denoising_start <= denoising_end

    t_start_val = 1.0 - denoising_start
    t_end_val = 1.0 - denoising_end

    t_start_idx = _find_last_index_ge_val(timesteps, t_start_val)
    t_end_idx = _find_last_index_ge_val(timesteps, t_end_val)

    clipped_timesteps = timesteps[t_start_idx : t_end_idx + 1]

    return clipped_timesteps


def clip_timestep_schedule_fractional(
    timesteps: list[float], denoising_start: float, denoising_end: float
) -> list[float]:
    """Clip the timestep schedule to the denoising range. Insert new timesteps to exactly match the desired denoising
    range. (A fractional version of clip_timestep_schedule().)

    Args:
        timesteps (list[float]): The original timestep schedule: [1.0, ..., 0.0].
        denoising_start (float): A value in [0, 1] specifying the start of the denoising process. E.g. a value of 0.2
            would mean that the denoising process start at t=0.8.
        denoising_end (float): A value in [0, 1] specifying the end of the denoising process. E.g. a value of 0.8 would
            mean that the denoising process ends at t=0.2.

    Returns:
        list[float]: The clipped timestep schedule.
    """
    assert 0.0 <= denoising_start <= 1.0
    assert 0.0 <= denoising_end <= 1.0
    assert denoising_start <= denoising_end

    t_start_val = 1.0 - denoising_start
    t_end_val = 1.0 - denoising_end

    t_start_idx = _find_last_index_ge_val(timesteps, t_start_val)
    t_end_idx = _find_last_index_ge_val(timesteps, t_end_val)

    clipped_timesteps = timesteps[t_start_idx : t_end_idx + 1]

    # We know that clipped_timesteps[0] >= t_start_val. Replace clipped_timesteps[0] with t_start_val.
    clipped_timesteps[0] = t_start_val

    # We know that clipped_timesteps[-1] >= t_end_val. If clipped_timesteps[-1] > t_end_val, add another step to
    # t_end_val.
    eps = 1e-6
    if clipped_timesteps[-1] > t_end_val + eps:
        clipped_timesteps.append(t_end_val)

    return clipped_timesteps


def generate_flow_sigmas(num_steps: int, schedule_type: str = "simple") -> list[float]:
    """Generate a sigma schedule in [0, 1] range for flow matching models.

    Args:
        num_steps: Number of denoising steps.
        schedule_type: Type of sigma schedule. One of:
            - "simple": Linear spacing (default, ComfyUI "simple")
            - "normal": Gaussian CDF schedule (ComfyUI "normal")
            - "ddim_uniform": DDIM-style leading uniform spacing
            - "karras": Karras schedule (concentrates steps at low noise)
            - "beta": Beta distribution schedule (concentrates steps at both ends)
            - "exponential": Exponential decay schedule
            - "sgm_uniform": Uniform spacing in sigma space

    Returns:
        list[float]: Sigma schedule from ~1.0 to 0.0 with num_steps+1 entries.
    """
    import numpy as np

    if schedule_type == "simple":
        # Linear spacing from 1 to 0 (ComfyUI "simple")
        sigmas = np.linspace(1.0, 0.0, num_steps + 1)
    elif schedule_type == "normal":
        # Gaussian CDF schedule (ComfyUI "normal")
        from scipy import stats

        x = np.linspace(0, 1, num_steps + 1)
        sigmas = 1.0 - stats.norm.cdf(x, loc=0.5, scale=0.15)
        # Normalize to start at ~1.0 and end at ~0.0
        sigmas = (sigmas - sigmas[-1]) / (sigmas[0] - sigmas[-1])
    elif schedule_type == "ddim_uniform":
        # DDIM-style leading uniform spacing
        num_train = 1000
        step_ratio = num_train // num_steps
        timesteps = np.arange(0, num_steps) * step_ratio + 1  # [1, 51, 101, ..., 951]
        timesteps = np.flip(timesteps)  # descending [951, 901, ..., 1]
        sigmas = timesteps / num_train  # [0.951, 0.901, ..., 0.001]
        sigmas = np.append(sigmas, 0.0)  # terminal sigma
    elif schedule_type == "karras":
        # Karras schedule adapted for [0, 1] range
        rho = 7.0
        sigma_min = 0.001
        sigma_max = 1.0
        ramp = np.linspace(0, 1, num_steps + 1)
        min_inv_rho = sigma_min ** (1.0 / rho)
        max_inv_rho = sigma_max ** (1.0 / rho)
        sigmas = (max_inv_rho + ramp * (min_inv_rho - max_inv_rho)) ** rho
    elif schedule_type == "beta":
        # Beta distribution CDF schedule
        from scipy import stats

        alpha = 0.6
        beta_param = 0.6
        x = np.linspace(0, 1, num_steps + 1)
        sigmas = 1.0 - stats.beta.cdf(x, alpha, beta_param)
    elif schedule_type == "exponential":
        # Exponential decay in [0, 1]
        sigma_min = 0.001
        sigma_max = 1.0
        sigmas = np.exp(np.linspace(math.log(sigma_max), math.log(sigma_min), num_steps + 1))
        # Append 0.0 as final value and trim to num_steps+1
        sigmas = np.append(sigmas[:-1], 0.0)
    elif schedule_type == "sgm_uniform":
        # SGM uniform: uniform spacing in timestep space (like ComfyUI's sgm_uniform)
        timesteps = np.linspace(1.0, 0.0, num_steps + 1)
        sigmas = timesteps  # For flow matching, sigmas == timesteps in [0, 1]
    else:
        raise ValueError(f"Unknown sigma schedule type: {schedule_type}")

    return sigmas.tolist()


def unpack(x: torch.Tensor, height: int, width: int) -> torch.Tensor:
    """Unpack flat array of patch embeddings to latent image."""
    return rearrange(
        x,
        "b (h w) (c ph pw) -> b c (h ph) (w pw)",
        h=math.ceil(height / 16),
        w=math.ceil(width / 16),
        ph=2,
        pw=2,
    )


def pack(x: torch.Tensor) -> torch.Tensor:
    """Pack latent image to flattented array of patch embeddings."""
    # Pixel unshuffle with a scale of 2, and flatten the height/width dimensions to get an array of patches.
    return rearrange(x, "b c (h ph) (w pw) -> b (h w) (c ph pw)", ph=2, pw=2)


def generate_img_ids(h: int, w: int, batch_size: int, device: torch.device, dtype: torch.dtype) -> torch.Tensor:
    """Generate tensor of image position ids.

    Args:
        h (int): Height of image in latent space.
        w (int): Width of image in latent space.
        batch_size (int): Batch size.
        device (torch.device): Device.
        dtype (torch.dtype): dtype.

    Returns:
        torch.Tensor: Image position ids.
    """

    if device.type == "mps":
        orig_dtype = dtype
        dtype = torch.float16

    img_ids = torch.zeros(h // 2, w // 2, 3, device=device, dtype=dtype)
    # Set batch offset to 0 for main image tokens
    img_ids[..., 0] = 0
    img_ids[..., 1] = img_ids[..., 1] + torch.arange(h // 2, device=device, dtype=dtype)[:, None]
    img_ids[..., 2] = img_ids[..., 2] + torch.arange(w // 2, device=device, dtype=dtype)[None, :]
    img_ids = repeat(img_ids, "h w c -> b (h w) c", b=batch_size)

    if device.type == "mps":
        img_ids = img_ids.to(orig_dtype)

    return img_ids
