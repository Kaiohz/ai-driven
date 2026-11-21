# Use Cases

## Discipline (STRICT — blocking rules)

1. **ONE use case class per file.** A file in `use_cases/` contains exactly one use case class, named after the file (`send_studio_agent_message.py` → `SendStudioAgentMessageUseCase`). The single result NamedTuple/dataclass of that use case may share the file. NEVER append a second `*UseCase` class to an existing use case's file — create a sibling file (`get_studio_agent_thread_messages.py` → `GetStudioAgentThreadMessagesUseCase`).
2. **Thin orchestrating use cases.** A use case orchestrates: load → delegate to a domain service/entity → call outbound ports → return. Business rules (validation guards, access policy, org/ownership checks, resolution decisions) NEVER live in use-case private methods — extract them to `domain/services/` as injectable services (pure domain classes, may take outbound ports as constructor deps). Heuristic: ≥3 business private helpers OR >~150 lines → refactor into a domain service. Pure plumbing helpers (logging, background-task shielding) may stay.
3. **Reuse-first for domain/application logic.** Before implementing any guard, query, loader, or resolver, grep `use_cases/`, `domain/services/`, and `domain/ports/` for an existing capability — inject and reuse it. Re-implementing logic the app already has (e.g. an existing conversation loader, access checker, or message-listing service) is a defect, not a style choice.

## GOOD — thin use case, rules in a domain service

```python
# application/use_cases/send_studio_agent_message.py — orchestration ONLY
class SendStudioAgentMessageUseCase:
    """One validated deep-agent turn of the CV Studio, history persisted."""

    def __init__(
        self,
        *,
        agent_port: StudioAgentPort,
        repo: StudioAgentRepoPort,
        access_policy: StudioAgentTurnAccessPolicy,  # domain service — the RULES
        cv_contents_repo: CvContentsRepositoryPort | None,
    ) -> None:
        self._agent = agent_port
        self._repo = repo
        self._access_policy = access_policy
        self._cv_contents_repo = cv_contents_repo

    async def execute(self, *, thread_id: str, message: str, ...) -> AsyncGenerator[StudioAgentStreamEvent, None]:
        # 1. Business rules delegated to the injected domain service.
        turn = await self._access_policy.resolve_turn(
            profile_id=profile_id, project_id=project_id,
            thread_id=thread_id, user_id=user_id, org_id=org_id,
        )
        if turn.error is not None:
            yield StudioAgentStreamEvent(kind="error", data=turn.error)
            return
        # 2. Orchestration only: persist → stream → persist.
        ...
```

```python
# domain/services/studio_agent_turn_access.py — the extracted business rules
class StudioAgentTurnAccessPolicy:
    """FR-102 turn validation: profile-org, project access, thread owner."""

    def __init__(
        self,
        *,
        profile_repo: ProfileRepositoryPort,
        project_repo: ProjectRepositoryPort,
        repo: StudioAgentRepoPort,
    ) -> None:
        self._profile_repo = profile_repo
        self._project_repo = project_repo
        self._repo = repo

    async def resolve_turn(self, *, profile_id: int, project_id: int,
                           thread_id: str | None, user_id: str,
                           org_id: str | None) -> StudioAgentTurn:
        # Every guard lives HERE, in the domain — reusable and testable.
        ...
```

A second use case gets its own file, and REUSES the same domain service instead of re-implementing the guards:

```python
# application/use_cases/get_studio_agent_thread_messages.py — sibling file
class GetStudioAgentThreadMessagesUseCase:
    """REST history read; the org/owner guard is the SAME domain service."""

    def __init__(self, *, repo: StudioAgentRepoPort,
                 access_policy: StudioAgentTurnAccessPolicy) -> None: ...
```

## BAD — the three violations in one file

```python
# application/use_cases/send_studio_agent_message.py — ❌ DON'T
class SendStudioAgentMessageUseCase:
    async def _refuse_profile_outside_org(self, ...):      # ❌ R2: business rule in a private method
        ...
    async def _accessible_project(self, ...):              # ❌ R2
        ...
    async def _refuse_foreign_thread_owner(self, ...):     # ❌ R2 (≥3 guards → domain service)
        ...

class GetStudioAgentThreadMessagesUseCase:                 # ❌ R1: second use case in the SAME file
    async def execute(self, *, thread_id: str, org_id: str | None):
        # ❌ R3: re-implements the org-guarded message listing the app already provides
        ...
```

Every ❌ above is a blocking review finding: extract the rules to `domain/services/`, move the second class to its own file, and inject the existing capability.

## Event-driven use case (inbound port)

```python
logger = logging.getLogger(__name__)

# Use ports inbound only when you want to call use case from infrastructure, like a consumer or a scheduler, to avoid importing application logic into infrastructure.
class HandleDeletionConfirmation(DeletionConfirmationListener):
    """Convert a terminator confirmation into a CREATE request to the scrapper."""

    def __init__(self, publisher: EventPublisher) -> None:
        self._publisher = publisher

    async def execute(self, message: KafkaMessage) -> None:
        project_id = message.payload.entity.project_id
        document_id = message.payload.entity.document_id
        correlation_id = message.metadata.correlationId
        uuid = message.metadata.uuid

        logger.info(
            UseCaseLogMessage.CONFIRMATION_RECEIVED,
            project_id,
            document_id,
            correlation_id,
        )

        create_message = KafkaMessage(
            metadata=EventMetadata(
                uuid=uuid,
                correlationId=correlation_id,
                timestamp=message.metadata.timestamp,
                # TODO: change to event or command later
                type=OperationCode.CREATE,
                source=MetadataSource(app=AppName.SUPERVISOR),
                target=MetadataTarget(app=AppName.SCRAPPER),
            ),
            payload=EventPayload(
                eventCode=EventCode(operationCode=OperationCode.CREATE),
                entity=message.payload.entity,
            ),
        )

        await self._publisher.publish(create_message)

        logger.info(
            UseCaseLogMessage.FORWARDING_CREATE_TO_SCRAPPER,
            project_id,
            document_id,
            correlation_id,
        )
```
