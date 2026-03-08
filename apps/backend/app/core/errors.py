class DomainError(Exception):
    """Base domain exception mapped to HTTP errors."""


class NotFoundError(DomainError):
    pass


class ConflictError(DomainError):
    pass


class ValidationError(DomainError):
    pass
